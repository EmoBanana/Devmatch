//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { Innovateth } from "../contracts/Innovateth.sol";

/**
 * @notice Deployment script for Chariteth contract
 */
contract DeployChariteth is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner returns (Innovateth) {
        Innovateth innovateth = new Innovateth();
        console.logString(
            string.concat(
                "Innovateth deployed at: ", vm.toString(address(innovateth))
            )
        );
        return innovateth;
    }
}