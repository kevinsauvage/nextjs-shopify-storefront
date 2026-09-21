import type { GetCustomerQuery } from '@/shopify/storefront';

const UserFullName = ({ user }: { user: GetCustomerQuery['customer'] | null | undefined }) => {
  const { firstName, lastName } = user || {};

  return (
    <b>
      {firstName} {lastName}
    </b>
  );
};

export default UserFullName;
