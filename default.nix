# This file defines a function that takes a single optional argument 'pkgs'
# If pkgs is not set, it defaults to importing the nixpkgs found in NIX_PATH
{
  pkgs, 
  mkYarnPackage,
  lib,
  nodejs-11_x,
  yarn,
  gitMinimal
}:

rec {
  llgCompanion = mkYarnPackage {
    version = "1.2.1";
    name = "llgCompanion";
  
    src = ./.;

    packageJson = ./package.json;
    yarnLock = ./yarn.lock;
  
    extraBuildInputs = [ nodejs-11_x yarn gitMinimal ];
    makeFlags = [ "PREFIX=$(out)" ];
  
    meta = with lib; {
      description = "Companion fo planInfo and dsb mix";
      license = licenses.agpl3;
      platforms = platforms.all;
    };
  };
}
