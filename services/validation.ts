// Validation service with reusable validators

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validators = {
  // Email validation
  email: (value: string): ValidationError | null => {
    if (!value) return { field: 'email', message: 'Email is required' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { field: 'email', message: 'Please enter a valid email address' };
    }
    return null;
  },

  // Phone validation (Ghana format: +233 or 0)
  phone: (value: string): ValidationError | null => {
    if (!value) return { field: 'phone', message: 'Phone number is required' };
    const phoneRegex = /^(\+233|0)[0-9]{9}$/;
    if (!phoneRegex.test(value.replace(/\s|-/g, ''))) {
      return { field: 'phone', message: 'Please enter a valid phone number' };
    }
    return null;
  },

  // Required field
  required: (value: any, fieldName: string): ValidationError | null => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    return null;
  },

  // Minimum length
  minLength: (value: string, min: number, fieldName: string): ValidationError | null => {
    if (value && value.length < min) {
      return { field: fieldName, message: `${fieldName} must be at least ${min} characters` };
    }
    return null;
  },

  // Minimum value (for numbers)
  minValue: (value: number, min: number, fieldName: string): ValidationError | null => {
    if (value !== null && value !== undefined && value < min) {
      return { field: fieldName, message: `${fieldName} must be at least ${min}` };
    }
    return null;
  },

  // Maximum value
  maxValue: (value: number, max: number, fieldName: string): ValidationError | null => {
    if (value !== null && value !== undefined && value > max) {
      return { field: fieldName, message: `${fieldName} must be at most ${max}` };
    }
    return null;
  },

  // Date validation
  date: (value: string, fieldName: string): ValidationError | null => {
    if (!value) return { field: fieldName, message: `${fieldName} is required` };
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { field: fieldName, message: `${fieldName} must be a valid date` };
    }
    return null;
  },

  // Date range validation
  dateRange: (startDate: string, endDate: string): ValidationError | null => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return { field: 'dateRange', message: 'End date must be after start date' };
    }
    return null;
  },

  // Currency amount (non-negative number with up to 2 decimals)
  currency: (value: any, fieldName: string): ValidationError | null => {
    if (value === null || value === undefined || value === '') {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { field: fieldName, message: `${fieldName} must be a valid number` };
    }
    if (num < 0) {
      return { field: fieldName, message: `${fieldName} cannot be negative` };
    }
    if (!Number.isInteger(num * 100)) {
      return { field: fieldName, message: `${fieldName} can have at most 2 decimal places` };
    }
    return null;
  },

  // URL validation
  url: (value: string, fieldName: string): ValidationError | null => {
    if (!value) return null; // URLs are often optional
    try {
      new URL(value);
      return null;
    } catch {
      return { field: fieldName, message: `${fieldName} must be a valid URL` };
    }
  },

  // Multiple validators
  validate: (value: any, validators: Array<() => ValidationError | null>): ValidationError | null => {
    for (const validator of validators) {
      const error = validator();
      if (error) return error;
    }
    return null;
  }
};

// Common form validation patterns
export const formValidators = {
  // Validate customer data
  customer: (data: any): ValidationResult => {
    const errors: ValidationError[] = [];
    
    const nameError = validators.required(data.name, 'Customer name');
    if (nameError) errors.push(nameError);

    const phoneError = validators.phone(data.phone);
    if (phoneError) errors.push(phoneError);

    const emailError = validators.email(data.email);
    if (emailError && data.email) errors.push(emailError); // Email is optional

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Validate booking data
  booking: (data: any): ValidationResult => {
    const errors: ValidationError[] = [];

    const customerError = validators.required(data.customerId, 'Customer');
    if (customerError) errors.push(customerError);

    const itemsError = validators.required(data.items?.length, 'Items');
    if (itemsError) errors.push({ field: 'items', message: 'Select at least one item' });

    const startDateError = validators.date(data.startDate, 'Start date');
    if (startDateError) errors.push(startDateError);

    const endDateError = validators.date(data.endDate, 'End date');
    if (endDateError) errors.push(endDateError);

    const dateRangeError = validators.dateRange(data.startDate, data.endDate);
    if (dateRangeError) errors.push(dateRangeError);

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Validate employee data
  employee: (data: any): ValidationResult => {
    const errors: ValidationError[] = [];

    const nameError = validators.required(data.name, 'Employee name');
    if (nameError) errors.push(nameError);

    const phoneError = validators.phone(data.phone);
    if (phoneError) errors.push(phoneError);

    const salaryError = validators.currency(data.salary, 'Salary');
    if (salaryError) errors.push(salaryError);

    const joinDateError = validators.date(data.joinDate, 'Join date');
    if (joinDateError) errors.push(joinDateError);

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Validate transaction data
  transaction: (data: any): ValidationResult => {
    const errors: ValidationError[] = [];

    const amountError = validators.currency(data.amount, 'Amount');
    if (amountError) errors.push(amountError);

    const typeError = validators.required(data.type, 'Transaction type');
    if (typeError) errors.push(typeError);

    const descriptionError = validators.required(data.description, 'Description');
    if (descriptionError) errors.push(descriptionError);

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
