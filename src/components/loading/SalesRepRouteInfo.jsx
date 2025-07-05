import React from "react";
import { User, Navigation, MapPin, Clock } from "lucide-react";

const SalesRepRouteInfo = ({
  salesReps,
  selectedSalesRep,
  onSalesRepChange,
  selectedRep,
  todayRouteInfo,
  formatTodayInfo,
}) => {
  return (
    <div className="bg-white shadow-sm rounded-xl p-4 md:p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <User className="h-5 w-5" />
        Loading Information
      </h2>

      {/* Sales Representative Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sales Representative <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedSalesRep}
          onChange={(e) => onSalesRepChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          required
        >
          <option value="">Select a sales representative</option>
          {salesReps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name} {rep.employeeId ? `(${rep.employeeId})` : ""}
            </option>
          ))}
        </select>
        {salesReps.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            No sales representatives found. Please add sales reps first.
          </p>
        )}
      </div>

      {/* Selected Sales Rep Info with Routes */}
      {selectedSalesRep && selectedRep && (
        <div className="mt-4 space-y-4">
          {/* Sales Rep Details */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-blue-900 truncate">
                  {selectedRep.name}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs text-blue-700 mt-1 space-y-1 sm:space-y-0">
                  {selectedRep.employeeId && (
                    <span>ID: {selectedRep.employeeId}</span>
                  )}
                  {selectedRep.phone && (
                    <span className="break-all">📞 {selectedRep.phone}</span>
                  )}
                  {selectedRep.email && (
                    <span className="break-all">📧 {selectedRep.email}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Today's Route */}
          {todayRouteInfo ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Navigation className="h-5 w-5 text-green-600 flex-shrink-0" />
                <h3 className="text-sm font-medium text-green-900">
                  Today's Route - {formatTodayInfo()}
                </h3>
              </div>

              {todayRouteInfo.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      Error loading route: {todayRouteInfo.error}
                    </p>
                  </div>
                </div>
              ) : todayRouteInfo.message ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-700">
                      {todayRouteInfo.message}
                    </p>
                  </div>
                </div>
              ) : !todayRouteInfo.isWorkingDay ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-700">
                      {todayRouteInfo.dayType === "sunday"
                        ? "Sunday - Non-working day"
                        : "Non-working day"}
                    </p>
                  </div>
                </div>
              ) : !todayRouteInfo.hasRoute ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-700">
                      No route assigned for today
                    </p>
                  </div>
                </div>
              ) : todayRouteInfo.route ? (
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="font-medium text-green-900">
                          {todayRouteInfo.route.name}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-green-700">
                        <p>
                          <span className="font-medium">Areas:</span>{" "}
                          {todayRouteInfo.route.areas?.length > 0
                            ? todayRouteInfo.route.areas
                                .slice(0, 3)
                                .join(", ") +
                              (todayRouteInfo.route.areas.length > 3
                                ? "..."
                                : "")
                            : "No areas specified"}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
                          {todayRouteInfo.route.estimatedDistance && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {todayRouteInfo.route.estimatedDistance} km
                            </span>
                          )}
                          {todayRouteInfo.route.estimatedTime && (
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {todayRouteInfo.route.estimatedTime} min
                              </span>
                            </span>
                          )}
                        </div>
                        {todayRouteInfo.route.description && (
                          <p className="mt-1">
                            <span className="font-medium">Notes:</span>{" "}
                            {todayRouteInfo.route.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      Route assigned but route details not found (Route ID:{" "}
                      {todayRouteInfo.routeId})
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : selectedSalesRep ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <p className="text-sm text-gray-600">
                  Loading route information...
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SalesRepRouteInfo;
