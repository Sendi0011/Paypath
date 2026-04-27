import PassportPage from '../../../src/components/pages/PassportPage';

export default async function PassportAddressPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  return <PassportPage address={address} />;
}