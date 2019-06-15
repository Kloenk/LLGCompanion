# This file defines a function that takes a single optional argument 'pkgs'
# If pkgs is not set, it defaults to importing the nixpkgs found in NIX_PATH
{
    pkgs ? import <nixpkgs> {},
    nodejs ? pkgs.nodejs-11_x,
    pkgs.yarn
}:
let
   # Convenience alias for the standard environment
   stdenv = pkgs.stdenv;
in rec {
  # Defines our application package
  app = stdenv.mkDerivation {
    name = "llgCompanion";
    # The source code is stored in our 'app' directory
    src = ./;
    # Our package depends on the nodejs package defined above
    buildInputs = [ nodejs yarn ];

    # copying files from the source directory (set as cwd) to the designated output directory ($out).
    #installPhase = ''
    #  mkdir -p $out
    #  cp -r * $out/
    #'';
  };
}