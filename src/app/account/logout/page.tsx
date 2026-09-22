import SpinnerLoader from '@/components/SpinnerLoader';
import { Card, CardContent } from '@/components/ui/card';

import LogoutClientEffect from './_components/LogoutClientEffect';

const Page = () => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <SpinnerLoader size="md" />
        <p className="text-body text-secondary">Signing you out…</p>
        <LogoutClientEffect />
      </CardContent>
    </Card>
  );
};

export default Page;
