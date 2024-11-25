<template>
    <div class="flex flex-col gap-4 h-full overflow-hidden py-1">
        <div class="px-2 flex flex-col gap-4">
            <div class="flex justify-between gap-2">
                <Select v-model="filterType">
                    <SelectTrigger class="w-1/4">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="skin">Skin</SelectItem>
                        <SelectItem value="case">Case</SelectItem>
                    </SelectContent>
                </Select>
                <Select v-model="sortType">
                    <SelectTrigger class="w-1/4">
                        <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="recent">Recent</SelectItem>
                        <SelectItem value="rarity">Rarity</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                    </SelectContent>
                </Select>
                <div class="gap-2 w-1/2 grid grid-cols-3">
                    <Button
                        variant="outline"
                        @click="
                            sortDirection =
                                sortDirection === 'asc' ? 'desc' : 'asc'
                        "
                    >
                        <SortAscendingIcon v-if="sortDirection === 'asc'" />
                        <SortDescendingIcon v-else />
                    </Button>
                    <Toggle
                        variant="outline"
                        v-model:pressed="searchOpen"
                    >
                        <SearchIcon class="h-4 w-4" />
                    </Toggle>
                    <Toggle
                        variant="outline"
                        v-model:pressed="selectEnabled"
                    >
                        <SelectIcon class="h-4 w-4" />
                    </Toggle>
                </div>
            </div>
            <div v-if="searchOpen">
                <Input
                    v-model="search"
                    placeholder="Search"
                />
            </div>
            <div
                v-if="selectEnabled"
                class="flex gap-2 justify-between"
            >
                <Button
                    variant="outline"
                    @click="toggleAll"
                >
                    {{
                        selectedItems.length === 0
                            ? 'Select All'
                            : 'Deselect ' + selectedItems.length
                    }}
                </Button>

                <Popover>
                    <PopoverTrigger as-child>
                        <Button
                            variant="outline"
                            :disabled="selectedItems.length === 0"
                        >
                            Sell Selected
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                        <p>
                            Are you sure you want to sell
                            {{ selectedItems.length }} items for
                            {{ selectedItemsPrice.toFixed(2) }}?
                        </p>
                        <div class="flex gap-2">
                            <Button
                                variant="outline"
                                @click="sellSelected"
                            >
                                Yes
                            </Button>
                            <PopoverClose>
                                <Button variant="outline">No</Button>
                            </PopoverClose>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
        <div
            class="overflow-y-auto grow grid-flow-row h-full grid grid-cols-2 gap-3 px-3"
        >
            <inventory-item
                :selected="selectedItems.includes(item.id)"
                @select="toggleSelected"
                :select-enabled="selectEnabled"
                v-for="item in sortedFilteredItems"
                :key="item.id"
                :item="item"
                @sell="sellItem"
                @reload="emit('reload')"
            />
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, ref, type PropType } from 'vue'
import InventoryItem from './InventoryItem.vue'
import Select from './ui/select/Select.vue'
import SelectContent from './ui/select/SelectContent.vue'
import SelectItem from './ui/select/SelectItem.vue'
import SelectTrigger from './ui/select/SelectTrigger.vue'
import SelectValue from './ui/select/SelectValue.vue'
import Button from './ui/button/Button.vue'
import SortAscendingIcon from '@/icons/SortAscendingIcon.vue'
import SortDescendingIcon from '@/icons/SortDescendingIcon.vue'
import SearchIcon from '@/icons/SearchIcon.vue'
import Input from './ui/input/Input.vue'
import SelectIcon from '@/icons/SelectIcon.vue'
import Toggle from './ui/toggle/Toggle.vue'
import axios from 'axios'
import Popover from './ui/popover/Popover.vue'
import PopoverTrigger from './ui/popover/PopoverTrigger.vue'
import PopoverContent from './ui/popover/PopoverContent.vue'
import { PopoverClose } from 'radix-vue'

const emit = defineEmits(['update:items', 'reload'])

const props = defineProps({
    items: {
        type: Array as PropType<any>,
        required: true,
    },
})

const filterType = ref('all')
const sortType = ref('recent')
const sortDirection = ref('desc')
const searchOpen = ref(false)
const selectEnabled = ref(false)
const search = ref('')
const selectedItems = ref([] as number[])

const filteredItems = computed(() => {
    return props.items
        .filter((item) => {
            if (filterType.value === 'all') return true
            if (filterType.value === 'skin') return item.type === 'skin'
            if (filterType.value === 'case') return item.type === 'crate'
            return item.type === filterType.value
        })
        .filter((item) => {
            if (searchOpen.value && search.value !== '') {
                return item.name
                    .toLowerCase()
                    .includes(search.value.toLowerCase())
            }
            return true
        })
})

const selectedItemsPrice = computed(() => {
    return selectedItems.value.reduce((acc, id) => {
        const item = props.items.find((item) => item.id === id)
        if (item) {
            return acc + item.price
        }
        return acc
    }, 0)
})

function getRarityNumber(rarity: string) {
    if (rarity === 'rarity_common_weapon' || rarity === 'Consumer Grade')
        return 1
    if (rarity === 'rarity_rare_weapon' || rarity === 'Mil-Spec Grade') return 2
    if (rarity === 'rarity_mythical_weapon' || rarity === 'Restricted') return 3
    if (rarity === 'rarity_legendary_weapon' || rarity === 'Classified')
        return 4
    if (rarity === 'rarity_ancient_weapon' || rarity === 'Covert') return 5
    return 0
}

const sortedFilteredItems = computed(() => {
    return filteredItems.value.slice().sort((a, b) => {
        if (sortType.value === 'recent') {
            return sortDirection.value === 'asc' ? a.id - b.id : b.id - a.id
        } else if (sortType.value === 'rarity') {
            return sortDirection.value === 'asc'
                ? getRarityNumber(a.rarity) - getRarityNumber(b.rarity)
                : getRarityNumber(b.rarity) - getRarityNumber(a.rarity)
        } else if (sortType.value === 'price') {
            return sortDirection.value === 'asc'
                ? a.price - b.price
                : b.price - a.price
        }
        return 0
    })
})

function toggleSelected(item: any) {
    if (selectedItems.value.includes(item.id)) {
        selectedItems.value = selectedItems.value.filter((id) => id !== item.id)
    } else {
        selectedItems.value.push(item.id)
    }
}

function toggleAll() {
    if (selectedItems.value.length === 0) {
        selectedItems.value = sortedFilteredItems.value.map((item) => item.id)
    } else {
        selectedItems.value = []
    }
}

async function sellItems(ids: number[]) {
    await axios.post(__API_PATH__ + '/items/sell', {
        items: ids,
    })
    emit(
        'update:items',
        props.items.filter((item) => !ids.includes(item.id))
    )
}

async function sellSelected() {
    await sellItems(selectedItems.value)
    selectedItems.value = []
}

async function sellItem(item: any) {
    await sellItems([item.id])
}
</script>
