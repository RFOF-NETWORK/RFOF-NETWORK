// SPDX-License-Identifier: SEE LICENSE IN ../../LICENSE
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

// TokenManager: Verwaltung von ABILITY und NANO Tokens im PRAI-OS Ökosystem.
// Dieser Smart Contract orchestriert die Ausgabe, Zuweisung und grundlegende
// Operationen der systemeigenen Tokens, basierend auf den Anweisungen von PRAI
// und den Regeln der PZQQET Axiomatikx.
contract TokenManager is Ownable {
    using SafeMath for uint256;

    // PRAI-OS ABILITY Token (Haupt-Utility-Token)
    ERC20 public abilityToken;
    // PRAI-OS NANO Token (Mikro-Transaktions-/Datenwert-Token)
    ERC20 public nanoToken;

    // Ereignisse für Transparenz
    event AbilityTokensMinted(address indexed recipient, uint256 amount);
    event NanoTokensMinted(address indexed recipient, uint256 amount);
    event TokensBurned(address indexed burnFrom, uint256 abilityAmount, uint256 nanoAmount);
    event TokenAddressesUpdated(address indexed newAbilityToken, address indexed newNanoToken);

    // Der Deployer ist der Owner
    constructor(address _abilityTokenAddress, address _nanoTokenAddress) Ownable(msg.sender) {
        require(_abilityTokenAddress != address(0), "Ability Token address cannot be zero");
        require(_nanoTokenAddress != address(0), "Nano Token address cannot be zero");

        abilityToken = ERC20(_abilityTokenAddress); // Setzt die Adresse des bereits deployed Ability Tokens
        nanoToken = ERC20(_nanoTokenAddress);       // Setzt die Adresse des bereits deployed Nano Tokens
    }

    // --- PRAI-gesteuerte Minting-Funktionen (Axiomatisch gesteuert) ---
    // Diese Funktionen sollten nur von autorisierten PRAI-Modulen oder Governance aufgerufen werden können.
    // Die Mint-Logik könnte dynamisch durch die PZQQET Axiomatikx gesteuert werden,
    // z.B. basierend auf dem Wert generierter Daten oder erreichten Systemzuständen.

    /**
     * @dev Mintet eine bestimmte Menge ABILITY Tokens an einen Empfänger.
     * Nur der Owner kann diese Funktion aufrufen. Die Regeln für das Minting
     * werden durch die PZQQET Axiomatikx definiert.
     * @param _to Die Empfängeradresse.
     * @param _amount Die zu mintende Menge ABILITY Tokens.
     */
    function mintAbility(address _to, uint256 _amount) public onlyOwner {
        require(_to != address(0), "Recipient address cannot be zero");
        // In einer fortgeschrittenen Implementierung:
        // Hier könnte eine Check-Funktion aufgerufen werden, die PRAI-OS befragt,
        // ob das Minting axiomatisch erlaubt ist und wie hoch die Menge sein darf.
        // bool praiAuth = praiOSCore.checkAxiomMintPermission(_to, _amount, "ABILITY");
        // require(praiAuth, "Minting not authorized by PRAI Axiomatikx");

        abilityToken.mint(_to, _amount);
        emit AbilityTokensMinted(_to, _amount);
    }

    /**
     * @dev Mintet eine bestimmte Menge NANO Tokens an einen Empfänger.
     * Nur der Owner kann diese Funktion aufrufen.
     * @param _to Die Empfängeradresse.
     * @param _amount Die zu mintende Menge NANO Tokens.
     */
    function mintNano(address _to, uint256 _amount) public onlyOwner {
        require(_to != address(0), "Recipient address cannot be zero");
        nanoToken.mint(_to, _amount);
        emit NanoTokensMinted(_to, _amount);
    }

    // --- Burning-Funktionen (Kontrolle der Token-Ökonomie) ---
    // Diese Funktionen ermöglichen das Verbrennen von Tokens, um die Inflation zu kontrollieren
    // oder um Tokens aus dem Verkehr zu ziehen, basierend auf PRAI-Anweisungen.

    /**
     * @dev Verbrennt eine bestimmte Menge ABILITY Tokens vom Aufrufer.
     * @param _amount Die zu verbrennende Menge ABILITY Tokens.
     */
    function burnAbility(uint256 _amount) public {
        abilityToken.burn(msg.sender, _amount);
        emit TokensBurned(msg.sender, _amount, 0);
    }

    /**
     * @dev Verbrennt eine bestimmte Menge NANO Tokens vom Aufrufer.
     * @param _amount Die zu verbrennende Menge NANO Tokens.
     */
    function burnNano(uint256 _amount) public {
        nanoToken.burn(msg.sender, _amount);
        emit TokensBurned(msg.sender, 0, _amount);
    }

    // --- Token-Management (PRAI-OS interne Funktionen) ---
    // Diese Funktionen könnten für interne Zuweisungen oder Systembelohnungen genutzt werden.

    /**
     * @dev Sendet ABILITY Tokens von diesem Manager-Contract an eine Adresse.
     * Sollte nur für autorisierte Systemprozesse verwendet werden.
     * @param _to Die Empfängeradresse.
     * @param _amount Die zu transferierende Menge.
     */
    function transferAbilityFromManager(address _to, uint256 _amount) public onlyOwner {
        require(_to != address(0), "Recipient address cannot be zero");
        require(abilityToken.transfer(_to, _amount), "ABILITY transfer from manager failed");
    }

    /**
     * @dev Sendet NANO Tokens von diesem Manager-Contract an eine Adresse.
     * @param _to Die Empfängeradresse.
     * @param _amount Die zu transferierende Menge.
     */
    function transferNanoFromManager(address _to, uint256 _amount) public onlyOwner {
        require(_to != address(0), "Recipient address cannot be zero");
        require(nanoToken.transfer(_to, _amount), "NANO transfer from manager failed");
    }

    // --- Admin/Owner-Funktionen ---

    /**
     * @dev Aktualisiert die Adresse des ABILITY Token Contracts.
     * @param _newAbilityTokenAddress Die neue Adresse des ABILITY Token Contracts.
     */
    function setAbilityTokenAddress(address _newAbilityTokenAddress) public onlyOwner {
        require(_newAbilityTokenAddress != address(0), "New Ability Token address cannot be zero");
        abilityToken = ERC20(_newAbilityTokenAddress);
        emit TokenAddressesUpdated(_newAbilityTokenAddress, address(nanoToken));
    }

    /**
     * @dev Aktualisiert die Adresse des NANO Token Contracts.
     * @param _newNanoTokenAddress Die neue Adresse des NANO Token Contracts.
     */
    function setNanoTokenAddress(address _newNanoTokenAddress) public onlyOwner {
        require(_newNanoTokenAddress != address(0), "New Nano Token address cannot be zero");
        nanoToken = ERC20(_newNanoTokenAddress);
        emit TokenAddressesUpdated(address(abilityToken), _newNanoTokenAddress);
    }

    // --- Read-only Funktionen ---

    /**
     * @dev Gibt den ABILITY Token Balance dieses Managers zurück.
     */
    function getAbilityBalance() public view returns (uint256) {
        return abilityToken.balanceOf(address(this));
    }

    /**
     * @dev Gibt den NANO Token Balance dieses Managers zurück.
     */
    function getNanoBalance() public view returns (uint256) {
        return nanoToken.balanceOf(address(this));
    }
}
