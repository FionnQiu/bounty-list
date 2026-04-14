import app from './app.js';
import { config } from './config.js';

app.listen(config.port, config.host, () => {
  console.log(`Bounty List API running at http://${config.host}:${config.port}`);
});