import { versions } from './versions';
import {spawnSync} from 'child_process';
import * as assert from 'assert';
import { getStdout } from './util';

type Machine = Pick<NodeJS.Process, 'platform' | 'arch'>;

export interface Version {
    version: string;
    /** Output of `pwsh --version`, used to double-check that the ambient installed pwsh matches the expected version */
    versionOutput: string;
    isPrerelease?: true;
    builds: ReadonlyArray<Readonly<Build>>;
}

export type Extension = '.tar.gz' | '.zip' | '.unknown';

export interface Build {
    arch: 'x64' | 'ia32' | 'arm';
    platform: NodeJS.Platform;
    extension: Extension;
    url: string;
    /** MUST be uppercase */
    sha256: string;
    /** relative path to pwsh executable within archive */
    bin: string;
}

export interface VersionBuildPair {
    version: Version;
    build: Build;
}

/**
 * Returns the version and build of powershell we should install, or undefined if no know candidate is found.
 * @param pwshVersion A pwsh version number or 'latest'
 */
export function getBestBuild(pwshVersion: string, machine: Machine = process): VersionBuildPair {
    for(let v of versions) {
        if((pwshVersion === 'latest' && !v.isPrerelease) || pwshVersion === 'prerelease' || v.version === pwshVersion) {
            for(let b of v.builds) {
                if(b.arch === machine.arch && b.platform === machine.platform) {
                    return {version: v, build: b};
                }
            }
        }
    }
}

/**
 * Directory name for a specific PowerShell build's installation.
 */
export function getDirnameForBuild({version, build}: VersionBuildPair) {
    return `powershell-${ version.version }-${ build.platform }-${ build.arch }`;
}

/**
 * Filename for a specific PowerShell build's download file, used to save tarball / zipfile into local cache.
 */
export function getFilenameForBuild(vb: VersionBuildPair) {
    return `${ getDirnameForBuild(vb) }${ vb.build.extension }`;
}

/** Invoke the ambient pwsh and get its $PSVersionTable */
export function getPSVersionTable(): PSVersionTable {
    const stdout = getStdout(['pwsh', '-noprofile', '-command', '$PSVersionTable | convertto-json']);
    return JSON.parse(stdout);
}

/** Structure of PowerShell's $PSVersionTable */
interface PSVersionTable {
    PSVersion: PSVersionTableVersion;
    PSEdition: 'Desktop' | 'Core';
    PSCompatibleVersions: Array<PSVersionTableVersion>;
    BuildVersion: PSVersionTableVersion;
    CLRVersion: PSVersionTableVersion;
    WSManStackVersion: PSVersionTableVersion;
    PSRemotingProtocolVersion: PSVersionTableVersion;
    SerializationVersion: PSVersionTableVersion;
}
interface PSVersionTableVersion {
    Major: number;
    Minor: number;
    Build: number;
    Revision: number;
    MajorRevision: number;
    MinorRevision: number;
}
