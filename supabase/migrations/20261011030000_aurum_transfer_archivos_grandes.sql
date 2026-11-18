-- AURUM Transfer debe admitir los modelos 3D de Mi Nube, que pueden superar 50 MiB.
-- El límite total por transferencia sigue siendo 2 GiB en la Edge Function.
update storage.buckets
set file_size_limit = 2147483648,
    public = false
where id = 'aurum-transfer';
