# Address Management Feature

This document describes the implementation of the address management feature that allows users to save and manage multiple shipping addresses.

## Overview

The address management feature enables users to:
- Save multiple shipping addresses with different names
- Set default addresses for faster checkout
- Edit and delete saved addresses
- Use saved addresses during checkout instead of re-entering information

## Backend Implementation

### Database Schema

The `user_addresses` table stores user addresses:

```sql
CREATE TABLE user_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT DEFAULT 'shipping' CHECK (type IN ('shipping', 'billing')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  phone TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### API Endpoints

#### Get User Addresses
```
GET /api/users/addresses
Authorization: Bearer <token>
```

#### Create Address
```
POST /api/users/addresses
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "shipping",
  "firstName": "John",
  "lastName": "Doe",
  "company": "Tech Corp",
  "addressLine1": "123 Main Street",
  "addressLine2": "Apt 4B",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "US",
  "phone": "+1234567890",
  "isDefault": true
}
```

#### Update Address
```
PUT /api/users/addresses/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "addressLine1": "456 Oak Avenue",
  "city": "Los Angeles",
  "state": "CA",
  "postalCode": "90210"
}
```

#### Delete Address
```
DELETE /api/users/addresses/:id
Authorization: Bearer <token>
```

#### Set Default Address
```
PUT /api/users/addresses/:id/default
Authorization: Bearer <token>
```

### Order Creation Enhancement

The order creation endpoint now supports saving shipping addresses:

```
POST /api/orders
{
  "email": "user@eshop.com",
  "shippingAddress": { ... },
  "saveShippingAddress": true
}
```

## Frontend Implementation

### Components

#### AddressSelector Component
Located at `frontend/src/components/AddressSelector.tsx`

Features:
- Display list of saved addresses
- Radio button selection
- Add new address dialog
- Edit existing address dialog
- Delete address functionality
- Set default address
- Visual indicators for default addresses

#### Profile Page
Located at `frontend/src/app/profile/page.tsx`

Features:
- Tabbed interface for profile management
- Address management tab
- Profile information editing
- Account statistics

### Checkout Integration

The checkout page (`frontend/src/app/checkout/page.tsx`) now includes:

1. **Address Selection Option**: Authenticated users can choose to use saved addresses
2. **Address Selector**: Radio button interface to select from saved addresses
3. **Manual Address Entry**: Fallback to manual form entry
4. **Save Address Option**: Checkbox to save new addresses during checkout

### API Integration

The frontend uses the following API functions from `frontend/src/lib/api.ts`:

- `getUserAddresses()` - Fetch user's saved addresses
- `createUserAddress(addressData)` - Create new address
- `updateUserAddress(addressId, addressData)` - Update existing address
- `deleteUserAddress(addressId)` - Delete address
- `setDefaultAddress(addressId)` - Set address as default
- `updateUserProfile(profileData)` - Update user profile

## User Experience

### For Authenticated Users

1. **Checkout Flow**:
   - Option to use saved addresses or enter new address
   - If using saved address: Select from radio button list
   - If entering new address: Fill form and optionally save for future use

2. **Profile Management**:
   - Access via user dropdown menu → Profile
   - Addresses tab for full address management
   - Add, edit, delete, and set default addresses

3. **Address Features**:
   - Multiple addresses with different names
   - Company information support
   - Phone number storage
   - Default address designation
   - Visual indicators for address types (home/business)

### For Guest Users

- Standard checkout form without address saving
- No address management features

## Security Considerations

- All address endpoints require authentication
- Users can only access their own addresses
- Address validation on both frontend and backend
- SQL injection protection through parameterized queries

## Testing

### Sample Data

The database seeding includes sample addresses for testing:

- **John Doe** (john.doe@example.com):
  - Default: 123 Main Street, Apt 4B, New York, NY
  - Secondary: 456 Oak Avenue, Los Angeles, CA

- **Jane Smith** (jane.smith@example.com):
  - Default: 789 Pine Street, Chicago, IL

### Test Scenarios

1. **Address Creation**: Add new address during checkout or profile
2. **Address Selection**: Use saved address during checkout
3. **Address Editing**: Modify existing address details
4. **Address Deletion**: Remove unwanted addresses
5. **Default Address**: Set and change default address
6. **Guest Checkout**: Verify guest users see standard form

## Future Enhancements

Potential improvements:
- Address validation using external APIs
- Address autocomplete
- International address support
- Address import/export
- Address sharing between family accounts
- Address history tracking 