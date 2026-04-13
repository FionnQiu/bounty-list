export function serializeUser(user) {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    phone: user.phone,
    email: user.email,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

export function serializeBounty(row) {
  const status = row.status === "open" ? "recruiting" : row.status;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    rewardAmount: Number(row.reward_amount),
    status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: {
      id: row.category_id,
      name: row.category_name
    },
    publisher: {
      id: row.publisher_id,
      username: row.publisher_username,
      avatarUrl: row.publisher_avatar_url
    }
  };
}
