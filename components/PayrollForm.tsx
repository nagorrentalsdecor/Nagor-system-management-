import React from 'react';
import { X, Calendar, FileText, Users, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface PayrollFormProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    month: string;
    year: string;
    notes: string;
    employees: Array<{
      id: string;
      name: string;
      position: string;
      salary: number;
      status: 'active' | 'inactive';
      includeInPayroll: boolean;
    }>;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onEmployeeToggle: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isEditing?: boolean;
}

export const PayrollForm: React.FC<PayrollFormProps> = ({
  isOpen,
  onClose,
  formData,
  onChange,
  onEmployeeToggle,
  onSubmit,
  isEditing = false
}) => {
  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const totalAmount = formData.employees
    .filter(emp => emp.includeInPayroll && emp.status === 'active')
    .reduce((sum, emp) => sum + emp.salary, 0);

  const activeEmployees = formData.employees.filter(emp => emp.status === 'active');
  const includedEmployees = formData.employees.filter(emp => emp.includeInPayroll && emp.status === 'active');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl my-8">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Payroll Run' : 'Generate Payroll Run'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">PAYROLL PERIOD</h3>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
                    Month
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      id="month"
                      name="month"
                      className="focus:ring-purple-500 focus:border-purple-500 block w-full pl-9 pr-10 sm:text-sm border-gray-300 rounded-md h-10"
                      value={formData.month}
                      onChange={onChange}
                      required
                    >
                      <option value="">Select month</option>
                      {months.map((month, index) => (
                        <option key={month} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <select
                      id="year"
                      name="year"
                      className="focus:ring-purple-500 focus:border-purple-500 block w-full pl-3 pr-10 sm:text-sm border-gray-300 rounded-md h-10"
                      value={formData.year}
                      onChange={onChange}
                      required
                    >
                      <option value="">Select year</option>
                      {years.map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute top-2 left-0 pl-3 flex items-start pointer-events-none">
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                  </div>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    className="focus:ring-purple-500 focus:border-purple-500 block w-full pl-9 sm:text-sm border border-gray-300 rounded-md"
                    placeholder="Add any notes about this payroll run"
                    value={formData.notes}
                    onChange={onChange}
                  />
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                      <DollarSign className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-purple-800">Payroll Summary</h4>
                    <div className="mt-2 text-sm text-purple-700">
                      <p>Employees: {includedEmployees.length} of {activeEmployees.length} active employees</p>
                      <p className="font-medium mt-1">
                        Total Amount: {new Intl.NumberFormat('en-GH', {
                          style: 'currency',
                          currency: 'GHS'
                        }).format(totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-gray-700">
                  EMPLOYEES ({includedEmployees.length} selected)
                </h3>
                <span className="text-xs text-gray-500">
                  {activeEmployees.length} active employees
                </span>
              </div>

              <div className="bg-gray-50 rounded-md overflow-hidden border border-gray-200 max-h-96 overflow-y-auto">
                {activeEmployees.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {formData.employees
                      .filter(emp => emp.status === 'active')
                      .map((employee) => (
                        <li key={employee.id} className="px-4 py-3 hover:bg-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                <Users className="h-5 w-5" />
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                                <p className="text-xs text-gray-500">{employee.position}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm font-medium text-gray-900">
                                {new Intl.NumberFormat('en-GH', {
                                  style: 'currency',
                                  currency: 'GHS'
                                }).format(employee.salary)}
                              </span>
                              <div className="flex items-center">
                                <input
                                  id={`employee-${employee.id}`}
                                  name={`employee-${employee.id}`}
                                  type="checkbox"
                                  checked={employee.includeInPayroll}
                                  onChange={() => onEmployeeToggle(employee.id)}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p>No active employees found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              disabled={includedEmployees.length === 0}
            >
              {isEditing ? 'Update Payroll Run' : 'Generate Payroll Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
