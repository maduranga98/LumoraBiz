// import React from "react";
// import { useAuth } from "../../contexts/AuthContext";
// import { Link } from "react-router-dom";
// import {
//   Users,
//   Package,
//   Factory,
//   DollarSign,
//   Plus,
//   LogOut,
// } from "lucide-react";

// const OwnerDashboard = () => {
//   const { logout, userProfile, currentUser } = useAuth();

//   const handleLogout = async () => {
//     await logout();
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <header className="bg-white shadow">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center py-6">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900">
//                 Owner Dashboard
//               </h1>
//               <p className="text-gray-600">Welcome back, {userProfile?.name}</p>
//             </div>
//             <div className="flex items-center gap-4">
//               <Link
//                 to="/owner/employees/add"
//                 className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
//               >
//                 <Plus className="w-4 h-4" />
//                 Add Employee
//               </Link>
//               <button
//                 onClick={handleLogout}
//                 className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
//               >
//                 <LogOut className="w-4 h-4" />
//                 Logout
//               </button>
//             </div>
//           </div>
//         </div>
//       </header>

//       <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
//         <div className="px-4 py-6 sm:px-0">
//           <div className="mb-6">
//             <h2 className="text-xl font-semibold text-gray-900 mb-2">
//               Business Overview
//             </h2>
//             <p className="text-gray-600">Owner ID: {currentUser?.uid}</p>
//           </div>

//           <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
//             <div className="bg-white overflow-hidden shadow rounded-lg">
//               <div className="p-5">
//                 <div className="flex items-center">
//                   <div className="flex-shrink-0">
//                     <Users className="h-6 w-6 text-gray-400" />
//                   </div>
//                   <div className="ml-5 w-0 flex-1">
//                     <dl>
//                       <dt className="text-sm font-medium text-gray-500 truncate">
//                         Total Employees
//                       </dt>
//                       <dd className="text-lg font-medium text-gray-900">24</dd>
//                     </dl>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="bg-white overflow-hidden shadow rounded-lg">
//               <div className="p-5">
//                 <div className="flex items-center">
//                   <div className="flex-shrink-0">
//                     <Package className="h-6 w-6 text-gray-400" />
//                   </div>
//                   <div className="ml-5 w-0 flex-1">
//                     <dl>
//                       <dt className="text-sm font-medium text-gray-500 truncate">
//                         Inventory Items
//                       </dt>
//                       <dd className="text-lg font-medium text-gray-900">150</dd>
//                     </dl>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="bg-white overflow-hidden shadow rounded-lg">
//               <div className="p-5">
//                 <div className="flex items-center">
//                   <div className="flex-shrink-0">
//                     <Factory className="h-6 w-6 text-gray-400" />
//                   </div>
//                   <div className="ml-5 w-0 flex-1">
//                     <dl>
//                       <dt className="text-sm font-medium text-gray-500 truncate">
//                         Production Today
//                       </dt>
//                       <dd className="text-lg font-medium text-gray-900">
//                         120 bags
//                       </dd>
//                     </dl>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="bg-white overflow-hidden shadow rounded-lg">
//               <div className="p-5">
//                 <div className="flex items-center">
//                   <div className="flex-shrink-0">
//                     <DollarSign className="h-6 w-6 text-gray-400" />
//                   </div>
//                   <div className="ml-5 w-0 flex-1">
//                     <dl>
//                       <dt className="text-sm font-medium text-gray-500 truncate">
//                         Monthly Revenue
//                       </dt>
//                       <dd className="text-lg font-medium text-gray-900">
//                         $8,500
//                       </dd>
//                     </dl>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white shadow rounded-lg p-6">
//             <h3 className="text-lg font-medium text-gray-900 mb-4">
//               Quick Actions
//             </h3>
//             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
//               <Link
//                 to="/owner/employees/add"
//                 className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
//               >
//                 <Users className="h-6 w-6 text-blue-600 mb-2" />
//                 <h4 className="font-medium text-gray-900">Add Employee</h4>
//                 <p className="text-sm text-gray-500">Add new staff members</p>
//               </Link>

//               <div className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
//                 <Package className="h-6 w-6 text-green-600 mb-2" />
//                 <h4 className="font-medium text-gray-900">Manage Inventory</h4>
//                 <p className="text-sm text-gray-500">Stock management</p>
//               </div>

//               <div className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
//                 <Factory className="h-6 w-6 text-purple-600 mb-2" />
//                 <h4 className="font-medium text-gray-900">Production</h4>
//                 <p className="text-sm text-gray-500">Manage production</p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// };

// export default OwnerDashboard;
