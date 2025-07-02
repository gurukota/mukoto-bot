import { eventCategories } from "db/schema.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";

export const getCategories = async () => {
    try {
        const categories = await db
            .select()
            .from(eventCategories)
            .where(eq(eventCategories.deleted, false));
        return categories;
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}