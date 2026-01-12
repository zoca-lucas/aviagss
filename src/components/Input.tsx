import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  suffix?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, suffix, className = '', ...props }, ref) => {
    return (
      <div className={`input-wrapper ${error ? 'has-error' : ''} ${className}`}>
        {label && (
          <label className="input-label">
            {label}
            {props.required && <span className="required">*</span>}
          </label>
        )}
        <div className="input-container">
          {icon && <span className="input-icon">{icon}</span>}
          <input ref={ref} className={`input ${icon ? 'has-icon' : ''}`} {...props} />
          {suffix && <span className="input-suffix">{suffix}</span>}
        </div>
        {error && <span className="input-error">{error}</span>}
        {hint && !error && <span className="input-hint">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
