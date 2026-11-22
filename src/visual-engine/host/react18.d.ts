import "react";
// The type parameter must stay `T` for declaration merging with React.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare module "react" { interface HTMLAttributes<T> { inert?: "" | boolean } }
