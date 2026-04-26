import PassportPage from '../../../src/pages/PassportPage';

export default function PassportAddressPage({ params }: { params: { address: string } }) {
  return <PassportPage address={params.address} />;
}
