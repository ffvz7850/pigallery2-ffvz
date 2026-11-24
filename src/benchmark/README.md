# PiGallery2 performance benchmark results

These results are created mostly for development, but the results are public for curious users.

You can also run it on your files by using the [docker-compose.yml](docker-compose) file.

See all benchmark results in [HISTORY.md](HISTORY.md)

## PiGallery2 v1.9.5-nightly, 07.01.2023
**Version**: v1.9.5-nightly, built at: Sat Jan 07 2023 12:40:10 GMT+0000 (Coordinated Universal Time), git commit:ffba3c3aef5300be1a30a92dda3ec9967b28720c

**System**: Raspberry Pi 4 4G Model B, SandisK Mobile Ultra 32Gb CLass10, UHS-I, SSD: Samsung Portable SSD T7 Shield 1TB

**Gallery**: directories: 31, photos: 2036, videos: 35, diskUsage : 22.08GB, persons : 1381, unique persons (faces): 25

| Action | Sub action | Average Duration | Result  |
|:------:|:----------:|:----------------:|:-------:|
| **Scanning directory** | | **9026.3 ms** | **media: 698, directories: 0, size: 252.91KB** |
| **Saving directory to DB** | | **779.7 ms** | **-** |
| **List directory** | | **262.0 ms** | **media: 698, directories: 0, size: 118.65KB** |
| | Authenticate | 0.1 ms | - |
| | Normalize path param | 0.0 ms | - |
| | Authorise path | 0.0 ms | - |
| | Inject gallery version | 2.3 ms | - |
| | List directory | 163.3 ms | media: 698, directories: 0, size: 378.87KB |
| | Add thumbnail information | 65.7 ms | media: 698, directories: 0, size: 394.92KB |
| | Clean up gallery results | 30.3 ms | media: 698, directories: 0, size: 118.65KB |
| | Add server timing | 0.0 ms | media: 698, directories: 0, size: 118.65KB |
| | Render result | 0.0 ms | media: 698, directories: 0, size: 118.65KB |
| **Listing Faces** | | **28.2 ms** | **items: 25, size: 2.22KB** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 2.4 ms | - |
| | List persons | 21.4 ms | items: 25, size: 25.60KB |
| | Add thumbnail info for persons | 2.4 ms | items: 25, size: 26.20KB |
| | Clean up person results | 1.7 ms | items: 25, size: 2.22KB |
| | Add server timing | 0.0 ms | items: 25, size: 2.22KB |
| | Render result | 0.0 ms | items: 25, size: 2.22KB |
| **Searching for `a`** | | **789.8 ms** | **media: 2066, directories: 0, size: 410.85KB** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 478.9 ms | media: 2066, directories: 0, size: 1.32MB |
| | Add thumbnail information | 190.9 ms | media: 2066, directories: 0, size: 1.37MB |
| | Clean up gallery results | 119.6 ms | media: 2066, directories: 0, size: 410.85KB |
| | Add server timing | 0.0 ms | media: 2066, directories: 0, size: 410.85KB |
| | Render result | 0.0 ms | media: 2066, directories: 0, size: 410.85KB |
| **Searching for `caption:a`** | | **3.0 ms** | **media: 0, directories: 0, size: 104.00B** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.1 ms | - |
| | Search | 2.5 ms | media: 0, directories: 0, size: 104.00B |
| | Add thumbnail information | 0.1 ms | media: 0, directories: 0, size: 104.00B |
| | Clean up gallery results | 0.1 ms | media: 0, directories: 0, size: 104.00B |
| | Add server timing | 0.0 ms | media: 0, directories: 0, size: 104.00B |
| | Render result | 0.0 ms | media: 0, directories: 0, size: 104.00B |
| **Searching for `directory:a`** | | **644.8 ms** | **media: 1705, directories: 0, size: 323.29KB** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 385.8 ms | media: 1705, directories: 0, size: 1.08MB |
| | Add thumbnail information | 161.3 ms | media: 1705, directories: 0, size: 1.12MB |
| | Clean up gallery results | 97.4 ms | media: 1705, directories: 0, size: 323.29KB |
| | Add server timing | 0.0 ms | media: 1705, directories: 0, size: 323.29KB |
| | Render result | 0.0 ms | media: 1705, directories: 0, size: 323.29KB |
| **Searching for `file-name:a`** | | **28.4 ms** | **media: 79, directories: 0, size: 7.69KB** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.1 ms | - |
| | Search | 17.4 ms | media: 79, directories: 0, size: 40.06KB |
| | Add thumbnail information | 7.5 ms | media: 79, directories: 0, size: 41.88KB |
| | Clean up gallery results | 3.1 ms | media: 79, directories: 0, size: 7.69KB |
| | Add server timing | 0.0 ms | media: 79, directories: 0, size: 7.69KB |
| | Render result | 0.0 ms | media: 79, directories: 0, size: 7.69KB |
| **Searching for `keyword:a`** | | **564.5 ms** | **media: 1536, directories: 0, size: 297.70KB** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 331.1 ms | media: 1536, directories: 0, size: 971.82KB |
| | Add thumbnail information | 145.0 ms | media: 1536, directories: 0, size: 1.01MB |
| | Clean up gallery results | 88.1 ms | media: 1536, directories: 0, size: 297.70KB |
| | Add server timing | 0.0 ms | media: 1536, directories: 0, size: 297.70KB |
| | Render result | 0.0 ms | media: 1536, directories: 0, size: 297.70KB |
| **Searching for `person:a`** | | **322.2 ms** | **media: 825, directories: 0, size: 195.22KB** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 191.0 ms | media: 825, directories: 0, size: 588.28KB |
| | Add thumbnail information | 79.0 ms | media: 825, directories: 0, size: 607.25KB |
| | Clean up gallery results | 51.8 ms | media: 825, directories: 0, size: 195.22KB |
| | Add server timing | 0.0 ms | media: 825, directories: 0, size: 195.22KB |
| | Render result | 0.0 ms | media: 825, directories: 0, size: 195.22KB |
| **Searching for `position:a`** | | **433.1 ms** | **media: 1133, directories: 0, size: 263.99KB** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 258.8 ms | media: 1133, directories: 0, size: 765.73KB |
| | Add thumbnail information | 106.1 ms | media: 1133, directories: 0, size: 791.79KB |
| | Clean up gallery results | 67.9 ms | media: 1133, directories: 0, size: 263.99KB |
| | Add server timing | 0.0 ms | media: 1133, directories: 0, size: 263.99KB |
| | Render result | 0.0 ms | media: 1133, directories: 0, size: 263.99KB |
| **Searching for `.`** | | **771.0 ms** | **media: 2071, directories: 0, size: 411.52KB** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 458.0 ms | media: 2071, directories: 0, size: 1.32MB |
| | Add thumbnail information | 193.9 ms | media: 2071, directories: 0, size: 1.37MB |
| | Clean up gallery results | 118.7 ms | media: 2071, directories: 0, size: 411.52KB |
| | Add server timing | 0.0 ms | media: 2071, directories: 0, size: 411.52KB |
| | Render result | 0.0 ms | media: 2071, directories: 0, size: 411.52KB |
| **Searching for `<Most common name>`** | | **101.2 ms** | **media: 262, directories: 0, size: 64.59KB** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 58.9 ms | media: 262, directories: 0, size: 188.67KB |
| | Add thumbnail information | 24.8 ms | media: 262, directories: 0, size: 194.70KB |
| | Clean up gallery results | 17.2 ms | media: 262, directories: 0, size: 64.59KB |
| | Add server timing | 0.0 ms | media: 262, directories: 0, size: 64.59KB |
| | Render result | 0.0 ms | media: 262, directories: 0, size: 64.59KB |
| **Searching for `<Most AND second common names>`** | | **14.0 ms** | **media: 20, directories: 0, size: 6.31KB** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.1 ms | - |
| | Search | 9.9 ms | media: 20, directories: 0, size: 17.92KB |
| | Add thumbnail information | 2.1 ms | media: 20, directories: 0, size: 18.38KB |
| | Clean up gallery results | 1.8 ms | media: 20, directories: 0, size: 6.31KB |
| | Add server timing | 0.0 ms | media: 20, directories: 0, size: 6.31KB |
| | Render result | 0.0 ms | media: 20, directories: 0, size: 6.31KB |
| **Searching for `<Most OR second common names>`** | | **170.7 ms** | **media: 448, directories: 0, size: 107.59KB** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 98.7 ms | media: 448, directories: 0, size: 329.26KB |
| | Add thumbnail information | 42.8 ms | media: 448, directories: 0, size: 339.56KB |
| | Clean up gallery results | 28.9 ms | media: 448, directories: 0, size: 107.59KB |
| | Add server timing | 0.0 ms | media: 448, directories: 0, size: 107.59KB |
| | Render result | 0.0 ms | media: 448, directories: 0, size: 107.59KB |
| **Searching for `<Contain at least 2 out of all names>`** | | **226.2 ms** | **media: 323, directories: 0, size: 85.34KB** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 171.9 ms | media: 323, directories: 0, size: 256.93KB |
| | Add thumbnail information | 31.2 ms | media: 323, directories: 0, size: 264.36KB |
| | Clean up gallery results | 22.7 ms | media: 323, directories: 0, size: 85.34KB |
| | Add server timing | 0.0 ms | media: 323, directories: 0, size: 85.34KB |
| | Render result | 0.0 ms | media: 323, directories: 0, size: 85.34KB |
| **Auto complete for `a`** | | **8.8 ms** | **items: 24, size: 979.00B** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.1 ms | - |
| | Autocomplete | 8.6 ms | items: 24, size: 979.00B |
| | Add server timing | 0.0 ms | items: 24, size: 979.00B |
| | Render result | 0.0 ms | items: 24, size: 979.00B |
*Measurements run 50 times and an average was calculated.

run for : 1942253.0ms


## PiGallery2 v1.9.3, 22.03.2022
**Version**: v1.9.3, built at: Mon Mar 21 2022 21:40:36 GMT+0000 (Coordinated Universal Time), git commit:6394eb4f86f119fd36de9fd06295c9345fc02a33

**System**: Raspberry Pi 4 4G Model B, SandisK Mobile Ultra 32Gb CLass10, UHS-I, HDD: Western Digital Elements 1TB (WDBUZG0010BBK)

**Gallery**: directories: 31, photos: 2036, videos: 35, diskUsage : 22.08GB, persons : 1381, unique persons (faces): 25

| Action | Sub action | Average Duration | Result  |
|:------:|:----------:|:----------------:|:-------:|
| **Scanning directory** | | **10915.9 ms** | **media: 698, directories: 0, size: 266.29KB** |
| **Saving directory to DB** | | **1789.6 ms** | **-** |
| **List directory** | | **326.9 ms** | **media: 698, directories: 0, size: 284.60KB** |
| | Authenticate | 0.1 ms | - |
| | Normalize path param | 0.0 ms | - |
| | Authorise path | 0.0 ms | - |
| | Inject gallery version | 2.7 ms | - |
| | List directory | 252.2 ms | media: 698, directories: 0, size: 429.46KB |
| | Add thumbnail information | 53.8 ms | media: 698, directories: 0, size: 429.46KB |
| | Clean up gallery results | 17.7 ms | media: 698, directories: 0, size: 284.60KB |
| | Add server timing | 0.1 ms | media: 698, directories: 0, size: 284.60KB |
| | Render result | 0.0 ms | media: 698, directories: 0, size: 284.60KB |
| **Listing Faces** | | **41.7 ms** | **items: 25, size: 2.20KB** |
| | Authenticate | 0.1 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 2.8 ms | - |
| | List persons | 35.1 ms | items: 25, size: 22.06KB |
| | Add thumbnail info for persons | 1.7 ms | items: 25, size: 22.63KB |
| | Clean up person results | 1.7 ms | items: 25, size: 2.20KB |
| | Add server timing | 0.1 ms | items: 25, size: 2.20KB |
| | Render result | 0.0 ms | items: 25, size: 2.20KB |
| **Searching for `a`** | | **787.5 ms** | **media: 2001, directories: 0, size: 1.16MB** |
| | Authenticate | 0.1 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 580.8 ms | media: 2001, directories: 0, size: 1.43MB |
| | Add thumbnail information | 159.6 ms | media: 2001, directories: 0, size: 1.43MB |
| | Clean up gallery results | 46.5 ms | media: 2001, directories: 0, size: 1.16MB |
| | Add server timing | 0.1 ms | media: 2001, directories: 0, size: 1.16MB |
| | Render result | 0.0 ms | media: 2001, directories: 0, size: 1.16MB |
| **Searching for `caption:a`** | | **11.1 ms** | **media: 0, directories: 0, size: 104.00B** |
| | Authenticate | 0.1 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 10.5 ms | media: 0, directories: 0, size: 104.00B |
| | Add thumbnail information | 0.1 ms | media: 0, directories: 0, size: 104.00B |
| | Clean up gallery results | 0.0 ms | media: 0, directories: 0, size: 104.00B |
| | Add server timing | 0.0 ms | media: 0, directories: 0, size: 104.00B |
| | Render result | 0.0 ms | media: 0, directories: 0, size: 104.00B |
| **Searching for `directory:a`** | | **665.5 ms** | **media: 1705, directories: 0, size: 937.45KB** |
| | Authenticate | 0.1 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 490.3 ms | media: 1705, directories: 0, size: 1.20MB |
| | Add thumbnail information | 135.2 ms | media: 1705, directories: 0, size: 1.20MB |
| | Clean up gallery results | 39.5 ms | media: 1705, directories: 0, size: 937.45KB |
| | Add server timing | 0.1 ms | media: 1705, directories: 0, size: 937.45KB |
| | Render result | 0.0 ms | media: 1705, directories: 0, size: 937.45KB |
| **Searching for `file-name:a`** | | **42.6 ms** | **media: 79, directories: 0, size: 19.10KB** |
| | Authenticate | 0.1 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 33.9 ms | media: 79, directories: 0, size: 44.65KB |
| | Add thumbnail information | 6.3 ms | media: 79, directories: 0, size: 44.65KB |
| | Clean up gallery results | 1.9 ms | media: 79, directories: 0, size: 19.10KB |
| | Add server timing | 0.1 ms | media: 79, directories: 0, size: 19.10KB |
| | Render result | 0.0 ms | media: 79, directories: 0, size: 19.10KB |
| **Searching for `keyword:a`** | | **615.6 ms** | **media: 1536, directories: 0, size: 864.26KB** |
| | Authenticate | 0.1 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 458.4 ms | media: 1536, directories: 0, size: 1.08MB |
| | Add thumbnail information | 120.9 ms | media: 1536, directories: 0, size: 1.08MB |
| | Clean up gallery results | 35.7 ms | media: 1536, directories: 0, size: 864.26KB |
| | Add server timing | 0.1 ms | media: 1536, directories: 0, size: 864.26KB |
| | Render result | 0.0 ms | media: 1536, directories: 0, size: 864.26KB |
| **Searching for `person:a`** | | **345.3 ms** | **media: 825, directories: 0, size: 558.95KB** |
| | Authenticate | 0.1 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 259.2 ms | media: 825, directories: 0, size: 657.60KB |
| | Add thumbnail information | 65.1 ms | media: 825, directories: 0, size: 657.60KB |
| | Clean up gallery results | 20.5 ms | media: 825, directories: 0, size: 558.95KB |
| | Add server timing | 0.1 ms | media: 825, directories: 0, size: 558.95KB |
| | Render result | 0.0 ms | media: 825, directories: 0, size: 558.95KB |
| **Searching for `position:a`** | | **462.3 ms** | **media: 1133, directories: 0, size: 757.51KB** |
| | Authenticate | 0.1 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 346.9 ms | media: 1133, directories: 0, size: 855.88KB |
| | Add thumbnail information | 89.3 ms | media: 1133, directories: 0, size: 855.88KB |
| | Clean up gallery results | 25.5 ms | media: 1133, directories: 0, size: 757.51KB |
| | Add server timing | 0.1 ms | media: 1133, directories: 0, size: 757.51KB |
| | Render result | 0.0 ms | media: 1133, directories: 0, size: 757.51KB |
| **Searching for `.`** | | **784.8 ms** | **media: 2001, directories: 0, size: 1.15MB** |
| | Authenticate | 0.1 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 580.6 ms | media: 2001, directories: 0, size: 1.43MB |
| | Add thumbnail information | 157.5 ms | media: 2001, directories: 0, size: 1.43MB |
| | Clean up gallery results | 46.2 ms | media: 2001, directories: 0, size: 1.15MB |
| | Add server timing | 0.1 ms | media: 2001, directories: 0, size: 1.15MB |
| | Render result | 0.0 ms | media: 2001, directories: 0, size: 1.15MB |
| **Searching for `<Most common name>`** | | **124.5 ms** | **media: 262, directories: 0, size: 182.97KB** |
| | Authenticate | 0.1 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 94.7 ms | media: 262, directories: 0, size: 211.22KB |
| | Add thumbnail information | 21.9 ms | media: 262, directories: 0, size: 211.22KB |
| | Clean up gallery results | 7.3 ms | media: 262, directories: 0, size: 182.97KB |
| | Add server timing | 0.1 ms | media: 262, directories: 0, size: 182.97KB |
| | Render result | 0.0 ms | media: 262, directories: 0, size: 182.97KB |
| **Searching for `<Most AND second common names>`** | | **26.8 ms** | **media: 20, directories: 0, size: 18.03KB** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 24.0 ms | media: 20, directories: 0, size: 19.70KB |
| | Add thumbnail information | 1.7 ms | media: 20, directories: 0, size: 19.70KB |
| | Clean up gallery results | 0.6 ms | media: 20, directories: 0, size: 18.03KB |
| | Add server timing | 0.1 ms | media: 20, directories: 0, size: 18.03KB |
| | Render result | 0.0 ms | media: 20, directories: 0, size: 18.03KB |
| **Searching for `<Most OR second common names>`** | | **198.3 ms** | **media: 448, directories: 0, size: 311.45KB** |
| | Authenticate | 0.1 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 150.0 ms | media: 448, directories: 0, size: 366.49KB |
| | Add thumbnail information | 36.0 ms | media: 448, directories: 0, size: 366.49KB |
| | Clean up gallery results | 11.8 ms | media: 448, directories: 0, size: 311.45KB |
| | Add server timing | 0.1 ms | media: 448, directories: 0, size: 311.45KB |
| | Render result | 0.0 ms | media: 448, directories: 0, size: 311.45KB |
| **Searching for `<Contain at least 2 out of all names>`** | | **364.0 ms** | **media: 323, directories: 0, size: 248.34KB** |
| | Authenticate | 0.1 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Search | 326.4 ms | media: 323, directories: 0, size: 284.36KB |
| | Add thumbnail information | 27.2 ms | media: 323, directories: 0, size: 284.36KB |
| | Clean up gallery results | 9.8 ms | media: 323, directories: 0, size: 248.34KB |
| | Add server timing | 0.1 ms | media: 323, directories: 0, size: 248.34KB |
| | Render result | 0.0 ms | media: 323, directories: 0, size: 248.34KB |
| **Auto complete for `a`** | | **13.5 ms** | **items: 24, size: 979.00B** |
| | Authenticate | 0.0 ms | - |
| | Authorise | 0.0 ms | - |
| | Inject gallery version | 0.2 ms | - |
| | Autocomplete | 13.0 ms | items: 24, size: 979.00B |
| | Add server timing | 0.1 ms | items: 24, size: 979.00B |
| | Render result | 0.0 ms | items: 24, size: 979.00B |

*Measurements run 20 times and an average was calculated.
Full runtime: 1522539.0ms


