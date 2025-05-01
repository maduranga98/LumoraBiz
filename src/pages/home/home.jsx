// src/pages/Home.jsx
import React from "react";
import Navbar from "../../components/Navbar";

const Home = () => {
  return (
    <div className="flex">
      {/* Left Sidebar Navigation */}
      <Navbar />

      {/* Main Content */}
      <div className="flex-1 min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-primary">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full bg-gray-100 text-muted hover:bg-gray-200">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              </button>
              <button className="text-primary hover:opacity-80">Logout</button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Card */}
            <div className="bg-white shadow rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-primary mb-2">
                Welcome to LumoraBiz
              </h2>
              <p className="text-muted">
                Your smart business tools are ready to use.
              </p>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="bg-white shadow rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Sales Overview</h3>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    +12%
                  </span>
                </div>
                <p className="text-2xl font-bold">$24,530</p>
                <p className="text-sm text-muted mt-1">
                  Total sales this month
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white shadow rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">New Customers</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    +5%
                  </span>
                </div>
                <p className="text-2xl font-bold">156</p>
                <p className="text-sm text-muted mt-1">Customers this month</p>
              </div>

              {/* Card 3 */}
              <div className="bg-white shadow rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Pending Orders</h3>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                    4 new
                  </span>
                </div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-muted mt-1">
                  Orders to be processed
                </p>
              </div>
            </div>

            {/* Recent Activity Section */}
            <div className="mt-6 bg-white shadow rounded-xl p-6">
              <h3 className="font-medium mb-4">Recent Activities</h3>
              <div className="space-y-4">
                {/* Activity Item 1 */}
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-primary flex items-center justify-center mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm">
                      New order <span className="font-medium">#ORD-5012</span>{" "}
                      has been received
                    </p>
                    <p className="text-xs text-muted mt-1">2 hours ago</p>
                  </div>
                </div>

                {/* Activity Item 2 */}
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm">
                      Payment for <span className="font-medium">#INV-2086</span>{" "}
                      has been received
                    </p>
                    <p className="text-xs text-muted mt-1">Yesterday</p>
                  </div>
                </div>

                {/* Activity Item 3 */}
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm">
                      New customer{" "}
                      <span className="font-medium">Jane Smith</span> has
                      registered
                    </p>
                    <p className="text-xs text-muted mt-1">2 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-muted">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-sm text-muted text-center">
              © {new Date().getFullYear()} Lumora Ventures Pvt Ltd. All rights
              reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Home;
