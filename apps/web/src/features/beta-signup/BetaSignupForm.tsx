import { type FormEvent, useState } from 'react';
import { taskBanditApi, TaskBanditApiError } from '../../api/taskbanditApi';
import type { BetaSignupSubmitInput } from '../../types/taskbandit';

const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CA', name: 'Canada' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

type FormState = Omit<BetaSignupSubmitInput, 'householdSizeEstimate'> & {
  householdSizeEstimate: string;
};

const emptyForm: FormState = {
  email: '',
  displayName: '',
  phone: '',
  householdName: '',
  householdSizeEstimate: '',
  billingAddressLine1: '',
  billingCity: '',
  billingPostalCode: '',
  billingCountry: 'GB',
  message: '',
};

export function BetaSignupForm({ onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: keyof FormState) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const sizeRaw = parseInt(form.householdSizeEstimate, 10);
      await taskBanditApi.submitBetaSignup({
        ...form,
        householdSizeEstimate: isNaN(sizeRaw) ? undefined : sizeRaw,
        message: form.message || undefined,
      });
      onSuccess();
    } catch (err) {
      if (err instanceof TaskBanditApiError && err.status === 409) {
        setError('A signup request for this email already exists.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Your details</legend>
        <label>
          <span>Full name *</span>
          <input
            type="text"
            required
            maxLength={120}
            value={form.displayName}
            onChange={handleChange('displayName')}
            autoComplete="name"
          />
        </label>
        <label>
          <span>Email address *</span>
          <input
            type="email"
            required
            value={form.email}
            onChange={handleChange('email')}
            autoComplete="email"
          />
        </label>
        <label>
          <span>Phone number *</span>
          <input
            type="tel"
            required
            maxLength={30}
            value={form.phone}
            onChange={handleChange('phone')}
            autoComplete="tel"
          />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: '1rem' }}>
        <legend style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Household</legend>
        <label>
          <span>Household name *</span>
          <input
            type="text"
            required
            maxLength={160}
            value={form.householdName}
            onChange={handleChange('householdName')}
            autoComplete="organization"
          />
        </label>
        <label>
          <span>Approximate household size</span>
          <input
            type="number"
            min={1}
            max={50}
            value={form.householdSizeEstimate}
            onChange={handleChange('householdSizeEstimate')}
          />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: '1rem' }}>
        <legend style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Billing address</legend>
        <label>
          <span>Address line 1 *</span>
          <input
            type="text"
            required
            maxLength={200}
            value={form.billingAddressLine1}
            onChange={handleChange('billingAddressLine1')}
            autoComplete="street-address"
          />
        </label>
        <label>
          <span>City *</span>
          <input
            type="text"
            required
            maxLength={100}
            value={form.billingCity}
            onChange={handleChange('billingCity')}
            autoComplete="address-level2"
          />
        </label>
        <label>
          <span>Postal code *</span>
          <input
            type="text"
            required
            maxLength={20}
            value={form.billingPostalCode}
            onChange={handleChange('billingPostalCode')}
            autoComplete="postal-code"
          />
        </label>
        <label>
          <span>Country *</span>
          <select
            required
            value={form.billingCountry}
            onChange={handleChange('billingCountry')}
            autoComplete="country"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <label style={{ marginTop: '1rem' }}>
        <span>Message (optional)</span>
        <textarea
          maxLength={500}
          rows={3}
          value={form.message}
          onChange={handleChange('message')}
          placeholder="Tell us a bit about how you plan to use TaskBandit"
        />
      </label>

      {error ? <p className="inline-message error-text">{error}</p> : null}

      <div className="button-row" style={{ marginTop: '1rem' }}>
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Request access'}
        </button>
        <button
          className="ghost-button"
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
