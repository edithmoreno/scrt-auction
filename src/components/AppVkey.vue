<template>
  <div class="app-vkey">
    <div v-if="!account">
        <p>Please log in using your<br>Keplr wallet</p>
    </div>
    <div v-if="account">
        <div class="no-key" v-if="!savedViewingKey && !viewingKey">
            <div class="vkey-error" v-if="isInError && !isInProgress">
                <p>Error creating your viewing key. Do you have enough SCRT?</p>
            </div>
            <loading-icon v-if="isInProgress">
                <p>Creating viewing key</p>
            </loading-icon>
            <button class="no-button" v-if="viewingKey == null && !isInProgress" @click="createViewingKey()">&#x1F511; Create viewing key</button>
        </div>

        <div class="saved-key" v-if="savedViewingKey && !isViewingKeyVisible">
            <button @click="isViewingKeyVisible = true">&#x1F511; Show viewing key</button>
        </div>

        <div class="vkey" v-if="viewingKey && isViewingKeyVisible">
            <dl v-if="savedViewingKey == viewingKey">
                <dt>Viewing key</dt>
                <dd class="vkey__saved-key">
                    {{ viewingKey.key | abbrv(20) }} 
                    <a class="delete" v-if="savedViewingKey && savedViewingKey == viewingKey" href="" @click="deleteViewingKey()"><img src="@/assets/trash-can-icon.svg" ></a>
                </dd>
            </dl>
            <div class="vkey__tools" v-if="savedViewingKey != viewingKey">
                <dl>
                    <dt>Viewing key</dt>
                </dl>
                <textarea v-if="savedViewingKey != viewingKey" class="vkey__key" readonly v-model="viewingKey.key"></textarea>
                <a class="save" href="" @click="saveViewingKey()">Save to wallet</a>
                <a class="remove" href="" @click="forgetViewingKey()">Forget</a>
            </div>
        </div>
    </div>
  </div>

</template>

<script>
import LoadingIcon from './LoadingIcon.vue';
export default {
  components: { LoadingIcon },
    props: {
        contract: {
            type: String,
            default: null,
        },
        account: {
            type: String,
            default: null,
        },
        value: {
            type: String,
            default: null,
        },
    },
    data() {
        return {
            isViewingKeyVisible: false,
            isInError: false,
            isInProgress: false,
            viewingKey: null,
        }
    },
    watch: {
        account(newValue, oldValue) {
            this.viewingKey = null;
        }
    },
    computed: {
        savedViewingKey() {
            let savedKey = this.$vkeys.get(this.account, this.contract);
            if(savedKey) {
                this.viewingKey = Object.assign(savedKey);
            }
            return savedKey;
        }
    },
    methods: {
        saveViewingKey() {
            this.$vkeys.put(this.account, this.contract, this.viewingKey.key);
        },
        deleteViewingKey() {
            this.$vkeys.delete(this.account, this.contract);
        },
        forgetViewingKey() {
            this.viewingKey = null;
        },
        async createViewingKey() {
            try {
                //console.log(this.$vkeys.get('x', 'x'));
                //console.log(this.$vkeys.get(this.auctionForm.account));
                this.isInProgress = true;
                
                this.viewingKey = { key: await this.$auctions.createViewingKey() };
                await this.$auctions.addUpdateWalletKey(this.$auctions.factoryAddress, this.viewingKey.key);
                
                this.isViewingKeyVisible = true;
                this.isInProgress = false;
                this.isInError = false;
            } catch(err) {
                this.isInProgress = false;
                this.isInError = err.message.indexOf('rejected') < 0;
            }
        },
    },
}
</script>

<style lang="scss">
    .app-vkey {
        button {
            width: 100%;
            font-weight: 600;

            &:hover {
                color: black;
                background-color: var(--color-white-secondary);
            }
        }
    }
    .vkey-error p {
        color: var(--color-negative);
    }
    .vkey {
        &__key {
            margin-bottom: var(--f-gutter-s);
        }
        &__saved-key {
            display: flex;
            flex-flow: row nowrap;
            justify-content: space-between;
            align-content: baseline;

            .delete {
                text-decoration: none;
                font-weight: 400;
            }
        }
        &__tools {
            display: flex;
            flex-flow: row wrap;
            justify-content: space-evenly;
            margin-bottom: var(--f-gutter);
            row-gap: var(--f-gutter-s);
            column-gap: var(--f-gutter-l);

            dl {
                margin-right: auto;
            }

            textarea {
                width: 100%;
            }
    
            a {
                font-size: 0.9em;
                font-weight: 600;
                text-decoration: none;

                &.save {
                    color: var(--color-positive);
                }
                &.remove {
                    color: var(--color-negative);
                }
            }
        }
    }
    
</style>