"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Star,
  Home,
  Building
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getUserAddresses, 
  createUserAddress, 
  updateUserAddress, 
  deleteUserAddress, 
  setDefaultAddress 
} from "@/lib/api";

interface Address {
  id: number;
  type: string;
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AddressSelectorProps {
  selectedAddressId?: number;
  onAddressSelect: (address: Address) => void;
  onAddressChange?: (address: Address) => void;
}

export default function AddressSelector({ 
  selectedAddressId, 
  onAddressSelect, 
  onAddressChange 
}: AddressSelectorProps) {
  const { isAuthenticated } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
    isDefault: false
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await getUserAddresses();
      setAddresses(response.addresses);
      
      // Auto-select default address if no address is selected
      if (!selectedAddressId && response.addresses.length > 0) {
        const defaultAddress = response.addresses.find((addr: Address) => addr.isDefault);
        if (defaultAddress) {
          onAddressSelect(defaultAddress);
        }
      }
    } catch (error) {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    try {
      const response = await createUserAddress({
        type: 'shipping',
        ...formData
      });
      
      setAddresses(prev => [...prev, response.address]);
      setShowAddDialog(false);
      resetForm();
      toast.success('Address added successfully');
      
      // Auto-select if it's the first address
      if (addresses.length === 0) {
        onAddressSelect(response.address);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add address');
    }
  };

  const handleEditAddress = async () => {
    if (!editingAddress) return;
    
    try {
      const response = await updateUserAddress(editingAddress.id, {
        type: 'shipping',
        ...formData
      });
      
      setAddresses(prev => prev.map(addr => 
        addr.id === editingAddress.id ? response.address : addr
      ));
      setShowEditDialog(false);
      setEditingAddress(null);
      resetForm();
      toast.success('Address updated successfully');
      
      // Update selected address if it was the one being edited
      if (selectedAddressId === editingAddress.id) {
        onAddressSelect(response.address);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update address');
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    try {
      await deleteUserAddress(addressId);
      setAddresses(prev => prev.filter(addr => addr.id !== addressId));
      toast.success('Address deleted successfully');
      
      // If deleted address was selected, select default or first address
      if (selectedAddressId === addressId) {
        const remainingAddresses = addresses.filter(addr => addr.id !== addressId);
        const defaultAddress = remainingAddresses.find(addr => addr.isDefault);
        if (defaultAddress) {
          onAddressSelect(defaultAddress);
        } else if (remainingAddresses.length > 0) {
          onAddressSelect(remainingAddresses[0]);
        }
      }
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (addressId: number) => {
    try {
      await setDefaultAddress(addressId);
      setAddresses(prev => prev.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId
      })));
      toast.success('Default address updated');
    } catch (error) {
      toast.error('Failed to set default address');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      company: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      phone: '',
      isDefault: false
    });
  };

  const openEditDialog = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company || '',
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || '',
      isDefault: address.isDefault
    });
    setShowEditDialog(true);
  };

  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <MapPin className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-gray-500">Loading addresses...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Address List */}
      {addresses.length > 0 && (
        <RadioGroup 
          value={selectedAddressId?.toString()} 
          onValueChange={(value) => {
            const address = addresses.find(addr => addr.id.toString() === value);
            if (address) {
              onAddressSelect(address);
            }
          }}
        >
          <div className="space-y-3">
            {addresses.map((address) => (
              <Card 
                key={address.id} 
                className={`cursor-pointer transition-colors ${
                  selectedAddressId === address.id 
                    ? 'ring-2 ring-blue-500 border-blue-500' 
                    : 'hover:border-gray-300'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <RadioGroupItem 
                        value={address.id.toString()} 
                        id={`address-${address.id}`}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            {address.company ? (
                              <Building className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Home className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="font-medium">
                              {address.firstName} {address.lastName}
                            </span>
                          </div>
                          {address.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        
                        {address.company && (
                          <p className="text-sm text-gray-600 mb-1">{address.company}</p>
                        )}
                        
                        <p className="text-sm text-gray-700">
                          {address.addressLine1}
                          {address.addressLine2 && <br />}
                          {address.addressLine2}
                        </p>
                        <p className="text-sm text-gray-700">
                          {address.city}, {address.state} {address.postalCode}
                        </p>
                        {address.phone && (
                          <p className="text-sm text-gray-600">{address.phone}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(address);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAddress(address.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </RadioGroup>
      )}

      {/* Add New Address Button */}
      <Button
        variant="outline"
        onClick={openAddDialog}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add New Address
      </Button>

      {/* Add Address Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
          </DialogHeader>
          <AddressForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleAddAddress}
            submitLabel="Add Address"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Address Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Address</DialogTitle>
          </DialogHeader>
          <AddressForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleEditAddress}
            submitLabel="Update Address"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface AddressFormProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  submitLabel: string;
}

function AddressForm({ formData, setFormData, onSubmit, submitLabel }: AddressFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="company">Company (Optional)</Label>
        <Input
          id="company"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="addressLine1">Address Line 1</Label>
        <Input
          id="addressLine1"
          value={formData.addressLine1}
          onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
        <Input
          id="addressLine2"
          value={formData.addressLine2}
          onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="postalCode">ZIP Code</Label>
          <Input
            id="postalCode"
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="phone">Phone (Optional)</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isDefault"
          checked={formData.isDefault}
          onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked as boolean })}
        />
        <Label htmlFor="isDefault">Set as default address</Label>
      </div>

      <Separator />

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={() => setFormData({ ...formData, isDefault: false })}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
} 