// src/pages/manager/components/ManagerMarkAttendance.jsx
import React from "react";
import { BusinessContextBridge } from "../../../contexts/ContextBridge";
import MarkAttendance from "../../../pages/employees/MarkAttendence";

const ManagerMarkAttendance = (props) => {
  return (
    <BusinessContextBridge>
      <MarkAttendance {...props} />
    </BusinessContextBridge>
  );
};

export default ManagerMarkAttendance;
