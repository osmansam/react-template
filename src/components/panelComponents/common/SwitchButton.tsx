import { Switch } from "@headlessui/react";

type Props = {
  checked: boolean;
  onChange: (value: (prev: boolean) => boolean) => void;
};

const SwitchButton = ({ checked, onChange }: Props) => {
  return (
    <Switch
      checked={checked}
      onChange={() => onChange((value) => !value)}
      className={`${
        checked ? "bg-neutral-900" : "bg-neutral-300"
      } relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:ring-offset-2 active:scale-95`}
    >
      <span
        aria-hidden="true"
        className={`${
          checked ? "translate-x-6" : "translate-x-1"
        } inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out`}
      />
    </Switch>
  );
};

export default SwitchButton;
