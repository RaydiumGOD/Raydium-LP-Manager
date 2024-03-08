# Raydium-LP-Manager
You can create pool and swap in one Jito Bundle. So, you will be first to buy your own token, then sell it later or Remove liquidity. 


# Detailed Features
1. Create Pool + Add Liquidity: The program allows you to enter desired amount of base tokens(COIN) and quote tokens(SOL), upon which it will create the liquidity pool.
2. Swap: Buy tokens along with 1st feature.
3. Tracking: The tracking feature allows you to monitor how much is your LP worth in SOL and how much are your swap tokens worth. You can set limits to remove LP or sell  tokens at take profit ratio or SOL as you desire.
4. Remove LP: with one click, you can remove Liquidity pool.
5. Sell Swap: with one click, Sell tokens that we bought in 2nd feature.

# Guide
In the repo, you will find my detailed guide on how to setup the project.

# You can check the whole source code for any sort of wallet drainers, if you dont trust an open sourced code.

# Contacts can be found in profile's bio.

# Faqs.
1. BlockHash Not found ERROR:
- Ignore it, but if it continously gives the error for more than a minute then you need to change your rpc as it suggests that your rpc is not healthy.
2. Bundle keeps getting rejected:
- Goto jito_bundle>build-bundle.ts, at line 86. increase jito tip fees which is in SOL lamports.
