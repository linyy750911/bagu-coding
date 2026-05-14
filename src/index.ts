#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('codebagu')
  .description('AI-first coding CLI with Code Bagu constraint enforcement')
  .version('1.0.0');

program.parse(process.argv);
