import { AuthForm } from '../auth-form';

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  return <AuthForm mode="register" defaultOrganizer={searchParams.type === 'organizer'} />;
}
