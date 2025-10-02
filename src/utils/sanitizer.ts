import { UserEntity } from '../entities/UserEntity';

export const sanitizerUser = (user: UserEntity) => {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        type: user.type,
        email_verified: user.email_verified,
        customer: user.customer
            ? {
                  id: user.customer.id,
                  name: user.customer.name,
                  last_name: user.customer.last_name,
                  dni: user.customer.dni,
                  phone: user.customer.phone,
                  birthday: user.customer.birthday,
              }
            : null,
    };
};
