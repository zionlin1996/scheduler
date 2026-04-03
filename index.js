require("dotenv").config();

const app = require("./src/app");

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`[scheduler] listening on port ${PORT}`));
