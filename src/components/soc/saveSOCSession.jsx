import React from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { retryableSave } from '@/lib/retryableSave';

// Callers remain pending until their captured result is saved successfully.
export function saveSOCSession(payload) {
  const save = retryableSave(payload, data => base44.entities.SOCSession.create(data));
  return new Promise(resolve => {
    const attempt = async () => {
      try {
        const result = await save();
        toast({ title: 'Simulation result saved', description: payload.scenario_name });
        resolve(result);
      } catch {
        toast({
          title: 'Simulation result was not saved',
          description: 'Keep this page open and retry to save this result.',
          variant: 'destructive',
          duration: Infinity,
          action: <ToastAction altText="Retry saving simulation result" onClick={attempt}>Retry save</ToastAction>,
        });
      }
    };
    attempt();
  });
}
