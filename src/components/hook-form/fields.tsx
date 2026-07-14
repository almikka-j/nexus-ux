import { RHFCode } from './rhf-code';
import { RHFSelect } from './rhf-select';
import { RHFUpload } from './rhf-upload';
import { RHFCheckbox } from './rhf-checkbox';
import { RHFTextField } from './rhf-text-field';
import { RHFPhoneInput } from './rhf-phone-input';
import { RHFAutocomplete } from './rhf-autocomplete';

// ----------------------------------------------------------------------

export const Field = {
  Text: RHFTextField,
  Select: RHFSelect,
  Checkbox: RHFCheckbox,
  Autocomplete: RHFAutocomplete,
  Phone: RHFPhoneInput,
  Upload: RHFUpload,
  Code: RHFCode,
};
