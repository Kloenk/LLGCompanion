# This file defines a function that takes a single optional argument 'pkgs'
# If pkgs is not set, it defaults to importing the nixpkgs found in NIX_PATH
{
  pkgs, 
  stdenv,
  lib,
  nodejs-11_x,
  yarn,
  gitMinimal,
  ...
}:

stdenv.mkDerivation rec {
  name = "llgCompanion-${version}";
  version = "1.2.1";

  src = ./.;

  buildInputs = [ nodejs-11_x yarn gitMinimal ];
  makeFlags = [ "PREFIX=$(out)" ];

  meta = with lib; {
    description = "Companion fo planInfo and dsb mix";
    license = licenses.agpl3;
    platforms = platforms.all;
  };
}
