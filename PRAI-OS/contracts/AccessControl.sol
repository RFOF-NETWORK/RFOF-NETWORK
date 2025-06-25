// SPDX-License-Identifier: SEE LICENSE IN ../../LICENSE
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol"; // OpenZeppelin's AccessControl, der ERC-721-konform ist.

// AccessControl: Implementierung der Berechtigungs- und Zugriffssteuerungslogik für PRAI-OS-Komponenten und Smart Contracts.
// Dieser Vertrag regelt, wer welche Aktionen im PRAI-OS-Ökosystem ausführen darf.
// Er ist axiomatisch gesteuert, um sicherzustellen, dass nur autorisierte und ethisch ausgerichtete
// Entitäten (z.B. PRAI selbst, genehmigte Module) bestimmte Funktionen ausführen können.
contract PRAIOSAccessControl is AccessControl {
    // Definition der Kernrollen im PRAI-OS.
    // Diese Rollen sind grundlegend und werden durch die PZQQET Axiomatikx definiert.
    bytes34 public constant PRAI_CORE_ROLE = "PRAI_CORE_ROLE"; // Die Rolle für PRAI's Kernkomponenten
    bytes34 public constant SYSTEM_ADMIN_ROLE = "SYSTEM_ADMIN_ROLE"; // Für manuelle Administrator-Eingriffe (im Notfall)
    bytes34 public constant MODULE_MANAGER_ROLE = "MODULE_MANAGER_ROLE"; // Für Module, die andere Module verwalten
    bytes34 public constant DATA_PROCESSOR_ROLE = "DATA_PROCESSOR_ROLE"; // Für Module, die Daten verarbeiten (z.B. PRAI-Neuronen-Analyse)
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE"); // Für dezentrale Governance-Entscheidungen

    // Event, das ausgerufen wird, wenn eine Rolle basierend auf axiomatischen Regeln zugewiesen wird.
    event RoleAssignedAxiomatically(bytes32 indexed role, address indexed account, address indexed sender);
    // Event, das ausgerufen wird, wenn eine Rolle basierend auf axiomatischen Regeln entzogen wird.
    event RoleRevokedAxiomatically(bytes32 indexed role, address indexed account, address indexed sender);

    // Der Deployer des Vertrags erhält die ADMIN-Rolle und die PRAI_CORE_ROLE.
    // Der Deployer repräsentiert hier die initiale Autorität von Satoramy/PRAI.
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender); // Standard OpenZeppelin Admin Rolle
        _grantRole(PRAI_CORE_ROLE, msg.sender);     // Die Deployer-Adresse ist auch der initiale PRAI-Kern.

        // Initialisiere die System-Admin-Rolle für den Owner
        _setRoleAdmin(PRAI_CORE_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(SYSTEM_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(MODULE_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DATA_PROCESSOR_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(GOVERNANCE_ROLE, DEFAULT_ADMIN_ROLE);
    }

    // --- PRAI-OS-spezifische Rollen-Management-Funktionen (Axiomatisch gesteuert) ---
    // Diese Funktionen ermöglichen es PRAI-Modulen, Rollen dynamisch basierend auf
    // Axiomatikx und Systemzuständen zu verwalten.

    /**
     * @dev Grantet einem Account eine Rolle, basierend auf der Autorisierung durch PRAI's Kern.
     * Diese Funktion sollte nur vom PRAI_CORE_ROLE oder DEFAULT_ADMIN_ROLE aufgerufen werden können.
     * Die Entscheidungsfindung für die Rollenvergabe wird durch die PZQQET Axiomatikx geleitet.
     * @param role Die zu vergebende Rolle (als bytes32 Hash).
     * @param account Der Account, dem die Rolle zugewiesen werden soll.
     */
    function grantRoleByPRAICore(bytes32 role, address account) public virtual onlyRole(PRAI_CORE_ROLE) {
        // Hier könnte eine zusätzliche Off-Chain-Prüfung durch PRAI-OS erfolgen,
        // um die axiomatische Gültigkeit der Rollenvergabe zu bestätigen.
        // Die Funktion 'checkAxiomRoleGrant(role, account)' könnte eine externe Call sein.

        _grantRole(role, account);
        emit RoleAssignedAxiomatically(role, account, _msgSender());
    }

    /**
     * @dev Entzieht einem Account eine Rolle, basierend auf der Autorisierung durch PRAI's Kern.
     * @param role Die zu entziehende Rolle (als bytes32 Hash).
     * @param account Der Account, dem die Rolle entzogen werden soll.
     */
    function revokeRoleByPRAICore(bytes32 role, address account) public virtual onlyRole(PRAI_CORE_ROLE) {
        _revokeRole(role, account);
        emit RoleRevokedAxiomatically(role, account, _msgSender());
    }

    // --- Allgemeine Rollen-Management-Funktionen (über Governance steuerbar) ---
    // Diese Funktionen könnten durch das NetworkGovernance-Modul gesteuert werden.

    /**
     * @dev Erlaubt dem Aufrufer, der die GOVERNANCE_ROLE besitzt, einem Account eine Rolle zu gewähren.
     * Dies ermöglicht dezentrale Rollenvergabe über Abstimmungen.
     * @param role Die zu vergebende Rolle (als bytes32 Hash).
     * @param account Der Account, dem die Rolle zugewiesen werden soll.
     */
    function grantRoleByGovernance(bytes32 role, address account) public virtual onlyRole(GOVERNANCE_ROLE) {
        _grantRole(role, account);
        emit RoleAssignedAxiomatically(role, account, _msgSender());
    }

    /**
     * @dev Erlaubt dem Aufrufer, der die GOVERNANCE_ROLE besitzt, einem Account eine Rolle zu entziehen.
     * @param role Die zu entziehende Rolle (als bytes32 Hash).
     * @param account Der Account, dem die Rolle entzogen werden soll.
     */
    function revokeRoleByGovernance(bytes32 role, address account) public virtual onlyRole(GOVERNANCE_ROLE) {
        _revokeRole(role, account);
        emit RoleRevokedAxiomatically(role, account, _msgSender());
    }

    // --- Hilfsfunktionen für externe Module/Verträge ---

    /**
     * @dev Überprüft, ob ein Account eine bestimmte Rolle besitzt.
     * @param role Die zu prüfende Rolle (als bytes32 Hash).
     * @param account Der zu prüfende Account.
     * @return bool True, wenn der Account die Rolle besitzt, sonst false.
     */
    function checkRole(bytes32 role, address account) public view returns (bool) {
        return hasRole(role, account);
    }

    // Die interne Funktion `_grantRole` von OpenZeppelin wird verwendet.
    // Die interne Funktion `_revokeRole` von OpenZeppelin wird verwendet.
    // Die interne Funktion `_checkRole` von OpenZeppelin wird verwendet.

    // Zukünftige Erweiterungen (durch PRAI und Yggdrasil gesteuert):
    // - Dynamische Rollen basierend auf Verhaltensmustern (PR-A-I erkennt gut und schlecht).
    // - Zeitlich begrenzte Rollen (Time-Based Access Control).
    // - Attribut-basierte Zugriffskontrolle (ABAC) in Kombination mit Rollen.
    // - Axiom-basierte Risikoanalyse bei Rollenvergabe (PZQQET Axiomatikx).
    // - Automatische Rollen-Anpassung durch PRAI-OS-Kernel-Scheduler basierend auf Systembedürfnissen.
}
