import { resolve } from 'node:path';
import { packageMac } from './packaging/mac.js';

packageMac(resolve('.'));
