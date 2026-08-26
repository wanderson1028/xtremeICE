import { useState, useEffect, useRef, useCallback } from "react";
import { getProgressionConfig, COMPROMISED_MAP } from "@/components/soc/scenarioProgression";
import { generateAlerts, generateLogs, generateEDRDetections, ENDPOINTS } from "@/components/soc/socData";
import { getScenarioPlaybook, actionRuleComplete } from "@/components/soc/scenarioPlaybooks";

// Dynamic threat evolution engine for SOC training.
// Makes scenarios adaptive: attacks progress in real-time, actions have
// real consequences on the simulation state, and each scenario escalates uniquely.
export function useThreatEvolution(scenario, simData, seed, attemptMode = "unguided") {
  const [threatLevel, setThreatLevel] = useState(30);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [liveLogs, setLiveLogs] = useState([]);
  const [liveEndpoints, setLiveEndpoints] = useState([]);
  const [liveEDR, setLiveEDR] = useState([]);
  const [eventFeed, setEventFeed] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [injectedEvents, setInjectedEvents] = useState(new Set());
  const [status, setStatus] = useState("active"); // active | contained | failed
  const [threatTrend, setThreatTrend] = useState("stable"); // rising | falling | stable

  const prevThreatRef = useRef(30);
  const completedActionsRef = useRef(new Set());

  // Reset simulation when new scenario data is provided
  useEffect(() => {
    if (!simData || !scenario) return;
    const config = getProgressionConfig(scenario.id, seed);
    setThreatLevel(config.initialThreat);
    prevThreatRef.current = config.initialThreat;
    setLiveAlerts(simData.alerts);
    setLiveLogs(simData.logs);
    setLiveEndpoints(simData.endpoints);
    setLiveEDR(simData.edr);
    setEventFeed([]);
    setElapsedSeconds(0);
    setInjectedEvents(new Set());
    setStatus("active");
    setThreatTrend("stable");
    completedActionsRef.current = new Set();
  }, [simData, scenario?.id, seed]);

  // Tick timer — runs every second while active
  useEffect(() => {
    if (status !== "active" || !scenario) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status, scenario]);

  // Threat level rises over time — every 10 seconds
  useEffect(() => {
    if (status !== "active" || !scenario) return;
    const config = getProgressionConfig(scenario.id, seed);
    const interval = setInterval(() => {
      setThreatLevel(prev => {
        const next = Math.min(prev + config.threatRatePerMin / 6, 100);
        if (next >= 100) {
          setStatus("failed");
        }
        return next;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [status, scenario]);

  // Guided attempts reveal the playbook, so they use a shorter hard time limit.
  const timeLimitMinutes = scenario && attemptMode === "guided"
    ? Math.max(5, Math.ceil((scenario.duration_min || 15) * 0.65))
    : null;

  useEffect(() => {
    if (status !== "active" || !timeLimitMinutes) return;
    if (elapsedSeconds < timeLimitMinutes * 60) return;
    setStatus("failed");
    setEventFeed(prev => [...prev, {
      id: `evt-time-limit-${Date.now()}`,
      time: new Date().toLocaleTimeString(),
      message: `Guided attempt time limit reached (${timeLimitMinutes} minutes).`,
      type: "penalty",
    }]);
  }, [elapsedSeconds, status, timeLimitMinutes]);

  // Track threat trend for UI indicator
  useEffect(() => {
    const prev = prevThreatRef.current;
    if (threatLevel > prev + 1) setThreatTrend("rising");
    else if (threatLevel < prev - 1) setThreatTrend("falling");
    else setThreatTrend("stable");
    prevThreatRef.current = threatLevel;
  }, [threatLevel]);

  // Inject escalation events at time thresholds
  useEffect(() => {
    if (status !== "active" || !scenario) return;
    const config = getProgressionConfig(scenario.id, seed);
    const elapsedMin = elapsedSeconds / 60;

    config.escalationEvents.forEach((evt, idx) => {
      if (elapsedMin >= evt.atMinute && !injectedEvents.has(idx)) {
        setInjectedEvents(prev => new Set([...prev, idx]));

        // Inject new alert
        if (evt.alert) {
          setLiveAlerts(prev => [...prev, { ...evt.alert, status: "open", timestamp: new Date().toISOString() }]);
        }

        // Inject new log
        if (evt.log) {
          setLiveLogs(prev => [...prev, {
            id: `esc-log-${idx}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            source: evt.log.src,
            type: evt.log.type,
            severity: evt.log.sev,
            message: evt.log.msg,
          }]);
        }

        // Spread compromise to new endpoints
        if (evt.spreadTo) {
          setLiveEndpoints(prev => prev.map(ep =>
            evt.spreadTo.includes(ep.id) && ep.status === "healthy"
              ? { ...ep, status: "compromised" }
              : ep
          ));
        }

        // Increase threat level
        if (evt.threatIncrease) {
          setThreatLevel(prev => Math.min(prev + evt.threatIncrease, 100));
        }

        // Add to event feed
        setEventFeed(prev => [...prev, {
          id: `evt-${idx}-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          message: evt.message,
          type: "escalation",
        }]);
      }
    });
  }, [elapsedSeconds, status, scenario, injectedEvents]);

  // Process an action and apply its consequences to the simulation state
  const processAction = useCallback((action) => {
    if (status !== "active" || !scenario) return;

    const config = getProgressionConfig(scenario.id, seed);
    const isPenalty = action.isPenalty;
    const actionId = action.id?.replace("rmm_", "").replace("edr_", "");
    const consequence = config.actionConsequences[actionId];

    if (isPenalty) {
      // Wrong action — slight threat increase, attack continues
      setThreatLevel(prev => Math.min(prev + 3, 100));
      setEventFeed(prev => [...prev, {
        id: `evt-${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        message: `Incorrect action: ${action.label} — attack continues unabated`,
        type: "penalty",
      }]);
      return;
    }

    if (!consequence) return;

    completedActionsRef.current.add(actionId);
    const playbook = getScenarioPlaybook(scenario.id);
    const responseComplete = ["triage", "contain", "recover"].every(phase =>
      actionRuleComplete(playbook.phases[phase], completedActionsRef.current)
    );

    // Apply threat reduction
    if (consequence.threatReduction) {
      setThreatLevel(prev => {
        const next = Math.max(prev - consequence.threatReduction, 0);
        if (next <= config.containmentThreshold && responseComplete) {
          setStatus(prevStatus => prevStatus === "active" ? "contained" : prevStatus);
        }
        return next;
      });
    }

    // Close alerts matching the consequence's target tactics
    if (consequence.closeAlertTactics) {
      setLiveAlerts(prev => prev.map(a =>
        consequence.closeAlertTactics.includes(a.tactic) && a.status === "open"
          ? { ...a, status: "closed" }
          : a
      ));
    }

    // Isolate the first compromised endpoint
    if (consequence.isolateFirstCompromised) {
      setLiveEndpoints(prev => {
        const firstCompromised = prev.find(ep => ep.status === "compromised");
        if (firstCompromised) {
          return prev.map(ep => ep.id === firstCompromised.id ? { ...ep, status: "isolated" } : ep);
        }
        return prev;
      });
    }

    // Add to event feed
    setEventFeed(prev => [...prev, {
      id: `evt-${Date.now()}`,
      time: new Date().toLocaleTimeString(),
      message: consequence.message,
      type: "action",
    }]);
  }, [status, scenario, seed]);

  // Mark as complete when report is generated after containment
  const markComplete = useCallback(() => {
    setStatus(prev => prev === "contained" ? "complete" : prev);
  }, []);

  // Add a time penalty (e.g., when a hint is revealed)
  const addTimePenalty = useCallback((seconds) => {
    setElapsedSeconds(prev => prev + seconds);
  }, []);

  return {
    threatLevel: Math.round(threatLevel),
    threatTrend,
    liveAlerts,
    liveLogs,
    liveEndpoints,
    liveEDR,
    eventFeed,
    elapsedSeconds,
    elapsedMinutes: Math.floor(elapsedSeconds / 60),
    timeLimitMinutes,
    attemptMode,
    status,
    processAction,
    markComplete,
    addTimePenalty,
    containmentThreshold: scenario ? getProgressionConfig(scenario.id, seed).containmentThreshold : 15,
    failureMessage: scenario ? getProgressionConfig(scenario.id, seed).failureMessage : "",
    successMessage: scenario ? getProgressionConfig(scenario.id, seed).successMessage : "",
  };
}