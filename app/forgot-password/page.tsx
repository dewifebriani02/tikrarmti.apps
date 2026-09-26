import { redirect } from 'next/navigation';

// Legacy link-based reset (Supabase) was replaced by the OTP flow.
export default function ForgotPasswordPage() {
  redirect('/lupa-password');
}
