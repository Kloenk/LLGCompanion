# This file defines a function that takes a single optional argument 'pkgs'
# If pkgs is not set, it defaults to importing the nixpkgs found in NIX_PATH
{
    pkgs, 
    nodejs-11_x,
    yarn,
    gitMinimal,
    lib
}:

lib.stdenv.mkDerivation rec {
  name = "shelfie-${version}";
  version = "1.2.1";

  srv = ./.;

  buildInputs = [ nodejs-11_x yarn gitMinimal ];
  makeFlags = [ "PREFIX=$(out)" ];

  met = with lib; {
    description = "Companion fo planInfo and dsb mix";
    license = licenses.agpl3;
    platforms = platforms.all;
  };
}
