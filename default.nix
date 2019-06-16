# This file defines a function that takes a single optional argument 'pkgs'
# If pkgs is not set, it defaults to importing the nixpkgs found in NIX_PATH
{
    pkgs ? import <nixpkgs> {},
    nodejs-11_x,
    yarn,
    gitMinimal,
    lib
}:
let
   # Convenience alias for the standard environment
   stdenv = pkgs.stdenv;
in rec {
  # Defines our application package
  app = stdenv.mkDerivation {
    name = "llgCompanion";
    # The source code is stored in our 'app' directory
    src = ./.;
    # Our package depends on the nodejs package defined above
    buildInputs = [ nodejs-11_x yarn gitMinimal ];

    makeFlags = [ "PREFIX=$(out)" ];
    installTargets = "install";
  };
  meta = with lib; {
    description = "Companion for planinfo and dsb mix as seen at llg";
    license = licenses.agpl3;
    platforms = platforms.all;
  };
}
