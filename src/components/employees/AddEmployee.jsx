import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { toast } from "react-hot-toast";
import { User, Mail, Phone, MapPin, Briefcase, Key, Copy } from "lucide-react";

const AddEmployee = () => {
  const { currentUser, createManager } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    role: "employee",
    department: "",
    salary: "",
    nicNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [managerCredentials, setManagerCredentials] = useState(null);

  const roles = [
    { value: "employee", label: "Employee" },
    { value: "manager", label: "Manager" },
    { value: "driver", label: "Driver" },
    { value: "operator", label: "Machine Operator" },
  ];

  const departments = [
    { value: "production", label: "Production" },
    { value: "inventory", label: "Inventory" },
    { value: "sales", label: "Sales" },
    { value: "finance", label: "Finance" },
    { value: "operations", label: "Operations" },
    { value: "transport", label: "Transport" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create employee record
      const employeeData = {
        ...formData,
        ownerId: currentUser.uid,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const employeeRef = await addDoc(
        collection(db, `owners/${currentUser.uid}/employees`),
        employeeData
      );

      // If role is manager, create manager credentials
      if (formData.role === "manager") {
        const managerData = await createManager(
          {
            ...formData,
            employeeId: employeeRef.id,
            permissions: ["view_dashboard"], // Default permissions
          },
          currentUser.uid
        );

        setManagerCredentials({
          username: managerData.username,
          password: managerData.password,
        });

        toast.success(`Manager created! Username: ${managerData.username}`);
      } else {
        toast.success("Employee added successfully");
      }

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        role: "employee",
        department: "",
        salary: "",
        nicNumber: "",
      });
    } catch (error) {
      console.error("Error adding employee:", error);
      toast.error("Failed to add employee");
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (managerCredentials) {
      const text = `Username: ${managerCredentials.username}\nPassword: ${managerCredentials.password}`;
      navigator.clipboard.writeText(text);
      toast.success("Credentials copied to clipboard");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Employee</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NIC Number *
              </label>
              <input
                type="text"
                value={formData.nicNumber}
                onChange={(e) =>
                  setFormData({ ...formData, nicNumber: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter NIC number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department *
              </label>
              <select
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salary (Monthly)
              </label>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) =>
                  setFormData({ ...formData, salary: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter monthly salary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter address"
                rows={3}
              />
            </div>
          </div>

          {formData.role === "manager" && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">
                Manager Account
              </h3>
              <p className="text-sm text-blue-700">
                A manager login account will be automatically created for this
                employee. Username and password will be generated and displayed
                after creation.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Adding Employee...
              </>
            ) : (
              "Add Employee"
            )}
          </button>
        </form>

        {/* Manager Credentials Modal */}
        {managerCredentials && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="text-center mb-4">
                <Key className="mx-auto w-12 h-12 text-green-600 mb-2" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Manager Account Created
                </h3>
                <p className="text-sm text-gray-600">
                  Save these credentials safely
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Username:
                    </label>
                    <p className="text-lg font-mono bg-white p-2 rounded border">
                      {managerCredentials.username}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Password:
                    </label>
                    <p className="text-lg font-mono bg-white p-2 rounded border">
                      {managerCredentials.password}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyCredentials}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Credentials
                </button>
                <button
                  onClick={() => setManagerCredentials(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddEmployee;
