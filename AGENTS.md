# Xtreme I.C.E. workspace instructions

## Base44 target

- Xtreme I.C.E. is the active Base44 app. Its app ID is `69a0a5a90473fac0aa3ea135`.
- Use `design-studio-integration` for all Design Studio development, including Kasm, Proxmox, and AWS learner work. Its Base44 branch ID is `6adc042dc1759e6183863750`. Verify the app and branch before editing and pass both IDs explicitly to every branch mutation.
- Use Xtreme I.C.E. `main` as the production reference. Changes to `main`, including merges, deployments, and publishing, require the user's explicit instruction for that operation.

## Historical apps

- The standalone Design Studio app and the Kasm Proof, Proxmox Proof, Assigned Proxmox Test, and AWS Capacity Proof apps are historical reference environments.
- Treat casual references such as “Kasm proof” or “Chasm proof” as the corresponding feature on `design-studio-integration`. Use a historical app only when the user explicitly identifies it as the target of an inventory, export, or retirement task.
- Keep provider proof results, archived source, and old app links as evidence. Route ongoing implementation and testing to the two Xtreme I.C.E. branches above.
