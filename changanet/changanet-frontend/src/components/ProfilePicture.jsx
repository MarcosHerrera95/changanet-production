const ProfilePicture = ({ 
  size = 'w-24 h-24', 
  className = '', 
  profileImageUrl, 
  user = null,
  showDefaultAvatar = true 
}) => {
  // 🔍 DEBUG: Verificar props recibidas
  console.log("🟡 ProfilePicture received:", { user, profileImageUrl });
  console.log("🟡 user?.url_foto_perfil:", user?.url_foto_perfil);
  console.log("🟡 profileImageUrl:", profileImageUrl);
  
  // Si se pasa un objeto user, priorizar url_foto_perfil sobre profileImageUrl
  const imageUrl = user?.url_foto_perfil || profileImageUrl;
  
  // Fallback a avatar generado si no hay imagen pero hay nombre de usuario
  const fallbackAvatarUrl = user?.nombre 
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nombre)}&size=120&background=random&color=fff&format=png`
    : null;
    
  console.log("🟡 ProfilePicture will use imageUrl:", imageUrl);

  return (
    <div className={`relative ${size} rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`Foto de perfil de ${user?.nombre || 'usuario'}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.log('ProfilePicture: Error cargando imagen:', imageUrl);
            // Intentar con avatar generado si falla la imagen original
            if (fallbackAvatarUrl && e.target.src !== fallbackAvatarUrl) {
              e.target.src = fallbackAvatarUrl;
            } else {
              // Fallback final a icono
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<div class="text-gray-400 text-2xl">👤</div>';
            }
          }}
        />
      ) : fallbackAvatarUrl && showDefaultAvatar ? (
        <img
          src={fallbackAvatarUrl}
          alt={`Avatar de ${user?.nombre || 'usuario'}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback final a icono
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = '<div class="text-gray-400 text-2xl">👤</div>';
          }}
        />
      ) : (
        <div className="text-gray-400 text-2xl">👤</div>
      )}
    </div>
  );
};

export default ProfilePicture;
