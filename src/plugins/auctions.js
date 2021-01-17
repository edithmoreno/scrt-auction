import { AuctionsApi } from '../lib/auctions-api.js'

import Vuex from 'vuex';

const tokens2Decimal = (amount, decimals) => {
    return Number(amount / Math.pow(10, decimals));
};

const colorHash = (str) => {
    const colors = ["purple", "orange", "cream", "blue", "yellow", "red", "green", "white"];

    var hash = 0, i, chr;
    for (i = 0; i < str.length; i++) {
      chr   = str.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return colors[Math.abs(hash) % colors.length];
}


// This plugin is the abstraction layer in charge of picking up the domain from the API client, 
// and convert it into a model usable by the UI
export default {
    install(Vue, options) {
        const auctionsApi = new AuctionsApi(options.chainClient, options.factoryAddress);

        const transformAuction = (rawction, status) => {
            const auction = {
                address: rawction.address,
                label: rawction.label,
                pair: rawction.pair,
                color: colorHash(rawction.address),
                color2: colorHash(rawction.label),
                sell: {
                    amount: rawction.sell_amount,
                    decimalAmount: tokens2Decimal(rawction.sell_amount, rawction.sell_decimals),
                    decimals: rawction.sell_decimals,
                    denom: rawction.pair.split("-")[0],
                },
                bid: {
                    decimals: rawction.bid_decimals,
                    denom: rawction.pair.split("-")[1],
                },
            };

            if(status == "active") {
                auction.bid.minimum = rawction.minimum_bid;
                auction.bid.decimalMinimum = tokens2Decimal(rawction.minimum_bid, rawction.bid_decimals);
                auction.closed = false;
            }
            if(status == "closed") {
                if(auction.winning_bid) {
                    auction.winning = {
                        amount: auction.winning_bid,
                        timestamp: auction.timestamp,
                    }
                }
                auction.closed = true;
            }

            return auction;
        }
        Vue.use(Vuex);
        Vue.prototype.$store.registerModule('$auctions', {
              namespaced: true,
              state: {
                  auctions: [],
                  auctionsFilter: {
                    sellToken: "",
                    bidToken: "",
                    showActive: true,
                    showClosed: false,
                    showMine: false,
                    viewMode: "grid",
                    sort: {
                        priority: "sell",
                        fields: {
                            sell: "asc",
                            bid:  "asc"
                        }
                    }
                  },
                  tokenData: [
                    {
                        codeId: 1,
                        symbol: "SODTA",
                        address: "secret1qvq5h3ta2qpng3vdlln7pu8mnhn98getzsw9ga",
                        name: "sodta",
                        label: "sodta",
                        decimals: 8
                    },
                    {
                        codeId: 1,
                        symbol: "SODTB",
                        address: "secret1wma0dyp30mncz8rdzga0426s9fzx6jmqmp79uy",
                        name: "sodtb",
                        label: "sodtb",
                        decimals: 6
                    },
                    {
                        codeId: 1,
                        symbol: "SODTC",
                        address: "secret1rdz9e9hln0lv0y33se380fczmmst72ffzlqg9a",
                        name: "SODTC",
                        label: "sodtc",
                        decimals: 6
                    },
                    {
                        codeId: 1,
                        symbol: "SODTD",
                        address: "secret1yt94lse0rl89a9kdylhr80jffpuekv0tzpx2k0",
                        name: "Stake or Die Token D",
                        label: "sodtd",
                        decimals: 6
                    },
                    {
                        codeId: 1,
                        symbol: "SODTE",
                        address: "secret18u0m2um6vv08ftzxls897gytd4tzcc2w6vlem6",
                        name: "Stake or Die Token E",
                        label: "sodta",
                        decimals: 6
                    }
                  ]
              },
              getters: {
                // Since filter and sorting is done in the client, this is performed by a getter instead
                // of a dispatcher storing a plain list of search results filtered and ordered in the server
                filteredAuctions: state => {
                    return state.auctions.filter(auction => {
                        if(state.auctionsFilter.sellToken != "" && auction.sell.denom != state.auctionsFilter.sellToken) {
                            return false;
                        }
                        if(state.auctionsFilter.bidToken != "" && auction.bid.denom != state.auctionsFilter.bidToken) {
                            return false;
                        }

                        // Checks for active status filter
                        if(state.auctionsFilter.showActive && !auction.closed) {
                            return true;
                        }
                        // Checks for closed status filter
                        if(state.auctionsFilter.showClosed && auction.closed) {
                            return true;
                        }
                        return false;
                    }).sort((a, b) => {
                        const sellOrderFactor = state.auctionsFilter.sort.fields.sell == "asc" ? -1 : 1;
                        const bidOrderFactor = state.auctionsFilter.sort.fields.bid == "asc" ? -1 : 1;

                        let primaryA, primaryB, primaryOrderFactor,
                            secondaryA, secondaryB, secondaryOrderFactor;

                        if(state.auctionsFilter.sort.priority == "sell") {
                            primaryA = a.sell.decimalAmount;
                            primaryB = b.sell.decimalAmount;
                            primaryOrderFactor = sellOrderFactor;

                            secondaryA = a.bid.decimalMinimum;
                            secondaryB = b.bid.decimalMinimum;
                            secondaryOrderFactor = bidOrderFactor;
                        } else {
                            primaryA = a.bid.decimalMinimum;
                            primaryB = b.bid.decimalMinimum;
                            primaryOrderFactor = bidOrderFactor;

                            secondaryA = a.sell.decimalAmount;
                            secondaryB = b.sell.decimalAmount;
                            secondaryOrderFactor = sellOrderFactor;
                        }

                        if(primaryA == primaryB) {
                            if(secondaryA > secondaryB) {
                                return secondaryOrderFactor * -1;
                            } else {
                                return secondaryOrderFactor;
                            }
                        }
                        if(primaryA > primaryB) {
                            return primaryOrderFactor * -1;
                        } else {
                            return primaryOrderFactor;
                        }
                    });
                },
                sellDenoms: state => {
                    return [...new Set(state.auctions.map(auction => {
                        return auction.sell.denom;
                    }))];
                },
                bidDenoms: state => {
                    return [...new Set(state.auctions.map(auction => {
                        return auction.bid.denom;
                    }))];
                },
                tokenData: state => {
                    return state.tokenData;
                }
              },
              mutations: {
                updateAuctions: (state, auctions) => {
                    state.auctions = auctions;
                },
                updateAuctionsFilter: (state, auctionsFilter) => {
                    state.auctionsFilter = auctionsFilter;
                },
              },
              actions: {
                updateAuctions: async ({ commit }) => {                    
                    const activeAuctions = (await auctionsApi.listAuctions("active"))?.map(auction => {
                        return transformAuction(auction, "active");
                    }) || [];
                    
                    const closedAuctions = (await auctionsApi.listAuctions("closed"))?.map(auction => {
                        return transformAuction(auction, "closed");
                    }) || [];

                    // We'll deal with the concurrency later
                    commit("updateAuctions", [...activeAuctions, ...closedAuctions]);
                },
                // If the server was the one doing the filtering and sorting the API call
                // would be made here and results stored in the state (through a mutation of course)
                updateAuctionsFilter: async({ commit }, auctionsFilter) => {
                    commit("updateAuctionsFilter", auctionsFilter)
                },
            }
        });
        
        Vue.prototype.$auctions =  new AuctionsApi(options.chainClient, options.factoryAddress);

        Vue.prototype.$auctions.updateAuctions = async () => {
            Vue.prototype.$store.dispatch('$auctions/updateAuctions');
        };

        Vue.prototype.$auctions.updateAuctionsFilter = async (auctionsFilter) => {
            Vue.prototype.$store.dispatch('$auctions/updateAuctionsFilter', auctionsFilter);
        };

    }
}