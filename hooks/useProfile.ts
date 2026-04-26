// Re-export from shared context so all consumers get the same state instance.
// Never import the context directly — always go through this hook.
export { useProfile } from '@/contexts/profile-context'
