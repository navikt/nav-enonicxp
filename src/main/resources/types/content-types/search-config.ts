// From the search-config2 type in the search app

export interface SearchConfig {
    /**
     * Fasetter
     */
    fasetter: Array<{
        /**
         * Navn
         */
        name: string;

        /**
         * Fasettnøkkel (bør ikke endres!)
         */
        facetKey: string;

        /**
         * Query
         */
        ruleQuery: string;

        /**
         * Underfasetter
         */
        underfasetter?: Array<{
            /**
             * Navn
             */
            name: string;

            /**
             * Fasettnøkkel (bør ikke endres!)
             */
            facetKey: string;

            /**
             * Query
             */
            ruleQuery: string;
        }>;
    }>;
}
