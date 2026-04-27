import PassportPage from '../../../src/pages/PassportPage';

export default async function PassportAddressPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  return <PassportPage address={address} />;
}