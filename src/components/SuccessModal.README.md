# SuccessModal Component

## Overview

The `SuccessModal` component displays a success confirmation modal after a bulk pass request is successfully submitted. It shows the tracking number, submission timestamp, and provides actions for the user to either submit another request or close the modal.

## Requirements

- **Requirement 24.1**: Display tracking number and submission timestamp
- **Requirement 24.5**: Display message about 2-3 business days email notification

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | boolean | Yes | Controls modal visibility |
| `onClose` | function | Yes | Callback function when modal is closed |
| `onSubmitAnother` | function | Yes | Callback function when "Submit Another Request" is clicked (should reset form state) |
| `trackingNumber` | string | Yes | Tracking number from API response (format: TEMP-{timestamp}-{random}) |
| `submissionTimestamp` | string | Yes | ISO 8601 timestamp of submission |

## Features

1. **Large Checkmark Icon**: Visual confirmation of successful submission
2. **Prominent Tracking Number**: Displayed in large monospace font with amber styling
3. **Submission Timestamp**: Formatted in Indian locale (DD MMM YYYY, HH:MM AM/PM)
4. **Success Message**: Informs user about 2-3 business day email response
5. **Action Buttons**:
   - Submit Another Request: Resets form to allow new submission
   - Close: Closes the modal
6. **Dark Mode Support**: Full support for light and dark themes
7. **Responsive Design**: Mobile-friendly layout
8. **Animations**: Smooth fade-in and zoom-in effects

## Usage Example

```jsx
import SuccessModal from "@/components/SuccessModal";

function BulkPassRequestPage() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);

  const handleFormSubmit = async (formData) => {
    try {
      const response = await fetch("/api/bulk-pass/public/request", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSubmissionData({
          trackingNumber: data.trackingNumber,
          submissionTimestamp: new Date().toISOString(),
        });
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Submission failed:", error);
    }
  };

  const handleSubmitAnother = () => {
    // Reset form state to allow another submission
    setShowSuccessModal(false);
    setSubmissionData(null);
    resetFormFields(); // Your form reset logic
  };

  const handleClose = () => {
    setShowSuccessModal(false);
    // Optionally navigate to another page
    // router.push("/");
  };

  return (
    <>
      {/* Your form component */}
      
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleClose}
        onSubmitAnother={handleSubmitAnother}
        trackingNumber={submissionData?.trackingNumber}
        submissionTimestamp={submissionData?.submissionTimestamp}
      />
    </>
  );
}
```

## Styling

The component uses Tailwind CSS classes and follows the existing HEP Frontend design system:

- Gradient header with emerald/teal colors
- Rounded corners (rounded-3xl)
- Shadow effects for depth
- Responsive padding and spacing
- Dark mode variants using `dark:` prefix

## Accessibility

- Modal backdrop prevents interaction with background content
- Close button has proper aria-label
- Keyboard navigation support (click handlers work with Enter key)
- High contrast colors for readability

## Error Handling

The component gracefully handles missing data:
- Missing `trackingNumber` displays "N/A"
- Missing `submissionTimestamp` displays "N/A"
- Component safely renders with null values

## State Management

The component is controlled by the parent component:
- Parent manages `isOpen` state
- Parent provides callbacks for user actions
- Parent is responsible for form state reset in `onSubmitAnother`

## Implementation Notes

1. **Form Reset**: The `onSubmitAnother` callback should clear all form fields and state to prevent accidental re-submission of previous data
2. **Navigation**: The `onClose` callback can optionally navigate the user to a different page
3. **Data Persistence**: The parent component should store `trackingNumber` and `submissionTimestamp` when receiving API response
4. **Timestamp Format**: The component expects ISO 8601 format (e.g., "2026-01-15T10:30:00Z") and formats it using `Intl.DateTimeFormat` with Indian locale

## Testing

See `__tests__/SuccessModal.test.js` for manual testing checklist and example unit tests.

## Related Components

- Public Bulk Pass Request Form (`/src/app/public/bulk-pass-request/page.js`)
- Other modal components in the project follow similar patterns
