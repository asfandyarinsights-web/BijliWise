# BijliWise Synthetic Electricity Dataset

**This data is synthetic.** It simulates household behaviour and contains no real meter readings or consumer data.

## How it was generated
`python generate_dataset.py` (fixed seed 42, fully reproducible). Each of 50 households gets a baseline from its
household size, a usage profile (energy_saver / typical / high_cooling), a city climate factor, summer cooling and
small winter demand, a slow long-term trend, shared monthly weather shocks, autocorrelated random noise and rare
usage spikes. Values are clipped to 40-1500 kWh. Re-running overwrites the CSV (never appends).

## Columns
| Column | Meaning |
|---|---|
| consumer_reference | Synthetic household ID (DEMO-1001...) |
| billing_month | YYYY-MM |
| household_size | Number of residents |
| city | Simulated city |
| season | winter / spring / summer / autumn |
| month | Calendar month 1-12 |
| previous_month_consumption | Previous month's kWh (first row uses a hidden Dec-2022 simulated value) |
| units_consumed | Monthly kWh (prediction target) |
| usage_profile | Simulated behaviour type (display only, not a model feature) |

Validation output: `dataset_validation_report.json`.

## Why only for demonstration
The patterns were written by us, so a model can learn them easily. Good scores here show the ML workflow works,
not that it would be accurate on real Pakistani consumers.
