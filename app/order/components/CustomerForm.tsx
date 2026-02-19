"use client";

export interface CustomerData {
  name: string;
  whatsapp: string;
  address: string;
  note?: string;
}

interface CustomerFormProps {
  customer: CustomerData;
  onChange: (field: keyof CustomerData, value: string) => void;
  errors: Partial<Record<keyof CustomerData, string>>;
}

export function validateIndonesianPhone(phone: string): boolean {
  // Indonesian: +62, 62, or 08 followed by 9-12 digits
  const cleaned = phone.replace(/\s/g, "");
  return /^(\+62|62|0)8[1-9][0-9]{6,10}$/.test(cleaned);
}

export default function CustomerForm({
  customer,
  onChange,
  errors,
}: CustomerFormProps) {
  const handleWhatsAppBlur = () => {
    if (customer.whatsapp && !validateIndonesianPhone(customer.whatsapp)) {
      return; // Error shown via errors prop
    }
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow-md sm:p-5">
      <h2 className="mb-4 text-base font-semibold text-dark-blue sm:text-lg">
        Informasi Pelanggan
      </h2>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="customer-name"
            className="block text-sm font-medium text-gray-600"
          >
            Nama <span className="text-primary-pink">*</span>
          </label>
          <input
            id="customer-name"
            type="text"
            value={customer.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Nama lengkap Anda"
            autoComplete="name"
            className={`mt-1 min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-base focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30 sm:text-sm ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="customer-whatsapp"
            className="block text-sm font-medium text-gray-600"
          >
            Nomor WhatsApp <span className="text-primary-pink">*</span>
          </label>
          <input
            id="customer-whatsapp"
            type="tel"
            inputMode="numeric"
            value={customer.whatsapp}
            onChange={(e) => onChange("whatsapp", e.target.value)}
            onBlur={handleWhatsAppBlur}
            placeholder="08xxxxxxxxxx atau +628xxxxxxxxxx"
            autoComplete="tel"
            className={`mt-1 min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-base focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30 sm:text-sm ${
              errors.whatsapp ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.whatsapp && (
            <p className="mt-1 text-sm text-red-500">{errors.whatsapp}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="customer-address"
            className="block text-sm font-medium text-gray-600"
          >
            Alamat Pengiriman <span className="text-primary-pink">*</span>
          </label>
          <textarea
            id="customer-address"
            value={customer.address}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder="Alamat pengiriman lengkap"
            rows={3}
            autoComplete="street-address"
            className={`mt-1 min-h-[88px] w-full resize-none rounded-lg border px-3 py-2.5 text-base focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30 sm:text-sm ${
              errors.address ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-500">{errors.address}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="customer-note"
            className="block text-sm font-medium text-gray-600"
          >
            Catatan
          </label>
          <textarea
            id="customer-note"
            value={customer.note}
            onChange={(e) => onChange("note", e.target.value)}
            placeholder="Permintaan khusus, instruksi pengiriman, atau catatan lainnya (opsional)"
            rows={2}
            className="mt-1 min-h-[64px] w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30 sm:text-sm"
          />
        </div>
      </div>
    </div>
  );
}
