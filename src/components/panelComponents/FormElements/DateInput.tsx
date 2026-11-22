import { lazy, Suspense, type ComponentProps } from "react";
const Control = lazy(() => import("./DateInputControl"));
type Props = ComponentProps<typeof Control>;
export default function DateInput(props: Props) {
  return (
    <Suspense fallback={<span role="status">Loading date control…</span>}>
      <Control {...props} />
    </Suspense>
  );
}
