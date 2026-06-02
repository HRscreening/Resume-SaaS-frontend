import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "!bg-[#0F0F0F] !text-white !border-0 !rounded-xl !shadow-lg !text-sm !font-medium",
          success: "!bg-[#0F0F0F] !text-white",
          icon: "!text-white",
        },
      }}
      {...props}
    />
  );
}
