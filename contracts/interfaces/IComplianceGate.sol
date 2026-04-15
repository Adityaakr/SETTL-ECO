// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IComplianceGate {
    enum ComplianceStatus {
        None,
        Approved,
        PendingReview,
        Restricted,
        Expired
    }

    function getStatus(address account) external view returns (ComplianceStatus);

    function isApproved(address account) external view returns (bool);
}
